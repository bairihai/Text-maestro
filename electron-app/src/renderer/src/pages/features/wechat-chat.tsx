/**
 * 微信聊天记录生成器 - Electron 渲染端
 *
 * 参考: https://github.com/bairihai/wechat-dialog-generator
 * 核心思路: HTML/CSS 渲染真实微信 UI（1125×2436 iPhone 高清画布） + html-to-image 截图
 * 不再使用 Python PIL 加速，所有视觉细节由 CSS 矢量渲染保证真实性
 */

import React, { useState, useRef, useCallback } from 'react';
import { toCanvas } from 'html-to-image';
import defaultAvatar from '@renderer/assets/wechat_default_avatar.jpg';
import './wechat-chat.css';

// ==================== 类型定义 ====================

interface ChatUser {
  id: number;
  name: string;
  avatar: string | null;
}

type MessageType = 'text' | 'time' | 'image' | 'voice' | 'redpacket' | 'transfer';

interface ChatMessage {
  id: number;
  type: MessageType;
  senderId: number;
  content: string;
  params: {
    duration?: number;
    amount?: string;
    remark?: string;
  };
}

interface PhoneSettings {
  time: string;
  signal: number;
  battery: number;
  contactName: string;
  unreadCount: number;
  selfBubbleColor: string;
  otherBubbleColor: string;
  theme: string;
}

// ==================== 主题预设 ====================

interface ThemePreset {
  name: string;
  className: string;
  selfBubble: string;
  otherBubble: string;
  phoneBg: string;
  swatch: [string, string, string];
}

const THEME_PRESETS: Record<string, ThemePreset> = {
  ios_classic: {
    name: 'iOS 经典',
    className: 'wc-theme-ios-classic',
    selfBubble: '#95ec69',
    otherBubble: '#ffffff',
    phoneBg: '#ededed',
    swatch: ['#ededed', '#95ec69', '#ffffff'],
  },
  ios_dark: {
    name: 'iOS 深色',
    className: 'wc-theme-ios-dark',
    selfBubble: '#2e5a2e',
    otherBubble: '#2c2c2e',
    phoneBg: '#1a1a1a',
    swatch: ['#1a1a1a', '#2e5a2e', '#2c2c2e'],
  },
  android: {
    name: 'Android',
    className: 'wc-theme-android',
    selfBubble: '#b2dfdb',
    otherBubble: '#ffffff',
    phoneBg: '#ffffff',
    swatch: ['#ffffff', '#b2dfdb', '#ffffff'],
  },
};

// ==================== 解析器（参考开源 parser.ts） ====================

const SELF_ALIASES = new Set(['我', '自己', 'me', 'Me', 'ME', 'myself', '本人']);
const MD_MSG_REG = /^\*\*(.+?)\*\*\s*[：:]\s*(.+)$/;
const MD_TIME_REG = /^\*{0,2}【(.+?)】\*{0,2}$/;
const TIME_REG = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}(\s+\d{1,2}:\d{2})?$/;
const TIME_REG2 = /^\d{1,2}:\d{2}$/;
const TIME_REG3 = /^(\d{4}年)?\d{1,2}月\d{1,2}日/;
const TIME_REG4 = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+(上午|下午|凌晨)$/;
const IMG_REG = /^\[图片\]\s*(.*)$/;
const IMG_MD_REG = /^!\[.*?\]\((.+?)\)$/;
const RP_REG = /^\[红包\]\s*(.*)$/;
const TRANSFER_REG = /^\[转账\]\s*(.*)$/;
const VOICE_REG = /^\[语音\]\s*(\d+)?$/;

function parseSpecialContent(content: string): { type: MessageType; content: string; params: ChatMessage['params'] } | null {
  let m = content.match(IMG_REG);
  if (m) return { type: 'image', content: m[1] || '', params: {} };
  m = content.match(IMG_MD_REG);
  if (m) return { type: 'image', content: m[1], params: {} };
  m = content.match(RP_REG);
  if (m) return { type: 'redpacket', content: '', params: { remark: m[1] || '恭喜发财，大吉大利' } };
  m = content.match(TRANSFER_REG);
  if (m) {
    const parts = (m[1] || '0').split(/[:：]/);
    return { type: 'transfer', content: '', params: { amount: parts[0] || '0', remark: parts[1] || '转账' } };
  }
  m = content.match(VOICE_REG);
  if (m) return { type: 'voice', content: '', params: { duration: parseInt(m[1] || '3', 10) } };
  return null;
}

function parseChatRecord(text: string): { users: ChatUser[]; messages: ChatMessage[] } {
  const lines = text.split('\n');
  const orderedNames: string[] = [];
  const seenNames = new Set<string>();

  // 第一遍: 收集所有发送者名称（按出现顺序）
  lines.forEach(rawLine => {
    let line = rawLine.trim();
    if (!line) return;
    if (/^#+\s/.test(line) || /^>/.test(line) || /^[-=*]{3,}$/.test(line)) return;
    line = line.replace(/^[-*]\s+/, '');
    if (MD_TIME_REG.test(line)) return;
    const stripped = line.replace(/\*\*/g, '').trim();
    if (TIME_REG.test(stripped) || TIME_REG2.test(stripped) || TIME_REG3.test(stripped) || TIME_REG4.test(stripped)) return;
    const mdMatch = line.match(MD_MSG_REG);
    if (mdMatch) {
      const name = mdMatch[1].replace(/\s+/g, '').trim();
      if (!seenNames.has(name) && !SELF_ALIASES.has(name)) {
        seenNames.add(name);
        orderedNames.push(name);
      }
      return;
    }
    const colonIdx = line.search(/[：:]/);
    if (colonIdx > 0) {
      const name = line.slice(0, colonIdx).trim().replace(/\*\*/g, '');
      if (!seenNames.has(name) && !SELF_ALIASES.has(name)) {
        seenNames.add(name);
        orderedNames.push(name);
      }
    }
  });

  // 构建用户列表: 第一个名字是"自己"
  const users: ChatUser[] = [];
  let nextId = 1;
  if (orderedNames.length > 0) {
    users.push({ id: nextId++, name: orderedNames[0], avatar: null });
    for (let i = 1; i < orderedNames.length; i++) {
      users.push({ id: nextId++, name: orderedNames[i], avatar: null });
    }
  }
  const nameMap: Record<string, number> = {};
  const selfUser = users[0];
  if (selfUser) {
    SELF_ALIASES.forEach(a => (nameMap[a.toLowerCase()] = selfUser.id));
    nameMap[selfUser.name.toLowerCase()] = selfUser.id;
    for (let i = 1; i < users.length; i++) {
      nameMap[users[i].name.toLowerCase()] = users[i].id;
    }
  }

  // 第二遍: 解析消息
  const messages: ChatMessage[] = [];
  let msgId = 1;
  lines.forEach(rawLine => {
    let line = rawLine.trim();
    if (!line) return;
    if (/^#+\s/.test(line)) return;
    if (/^>/.test(line)) return;
    if (/^[-=*]{3,}$/.test(line)) return;
    line = line.replace(/^[-*]\s+/, '');
    const mdTimeMatch = line.match(MD_TIME_REG);
    if (mdTimeMatch) {
      messages.push({ id: msgId++, type: 'time', senderId: selfUser?.id ?? 1, content: mdTimeMatch[1], params: {} });
      return;
    }
    const stripped = line.replace(/\*\*/g, '').trim();
    if (TIME_REG.test(stripped) || TIME_REG2.test(stripped) || TIME_REG3.test(stripped) || TIME_REG4.test(stripped)) {
      messages.push({ id: msgId++, type: 'time', senderId: selfUser?.id ?? 1, content: stripped, params: {} });
      return;
    }
    const mdMsgMatch = line.match(MD_MSG_REG);
    if (mdMsgMatch) {
      const rawName = mdMsgMatch[1].replace(/\s+/g, '').trim();
      let content = mdMsgMatch[2].trim();
      content = content.replace(/@\S+/g, '').trim();
      if (!content) return;
      const nameLower = rawName.toLowerCase();
      let senderId: number;
      if (SELF_ALIASES.has(rawName) || SELF_ALIASES.has(nameLower) || nameLower === selfUser?.name.toLowerCase()) {
        senderId = selfUser?.id ?? 1;
      } else if (nameMap[nameLower] !== undefined) {
        senderId = nameMap[nameLower];
      } else {
        const newUser: ChatUser = { id: nextId++, name: rawName, avatar: null };
        users.push(newUser);
        nameMap[nameLower] = newUser.id;
        senderId = newUser.id;
      }
      const special = parseSpecialContent(content);
      if (special) {
        messages.push({ id: msgId++, type: special.type, senderId, content: special.content, params: special.params });
      } else {
        messages.push({ id: msgId++, type: 'text', senderId, content, params: {} });
      }
      return;
    }
    const colonIdx = line.search(/[：:]/);
    if (colonIdx > 0) {
      const rawName = line.slice(0, colonIdx).trim().replace(/\*\*/g, '');
      const content = line.slice(colonIdx + 1).trim();
      if (!content) return;
      const nameLower = rawName.toLowerCase();
      let senderId: number;
      if (SELF_ALIASES.has(rawName) || SELF_ALIASES.has(nameLower) || nameLower === selfUser?.name.toLowerCase()) {
        senderId = selfUser?.id ?? 1;
      } else if (nameMap[nameLower] !== undefined) {
        senderId = nameMap[nameLower];
      } else {
        const newUser: ChatUser = { id: nextId++, name: rawName, avatar: null };
        users.push(newUser);
        nameMap[nameLower] = newUser.id;
        senderId = newUser.id;
      }
      const special2 = parseSpecialContent(content);
      if (special2) {
        messages.push({ id: msgId++, type: special2.type, senderId, content: special2.content, params: special2.params });
      } else {
        messages.push({ id: msgId++, type: 'text', senderId, content, params: {} });
      }
    }
  });

  return { users, messages };
}

const EXAMPLE_TEXT = `**【3月1日 14:32】**

**张三**：你好，在忙不？有个事想请你帮个忙
**李四**：不忙，怎么了？
**张三**：有个项目需要你帮忙处理下数据
**李四**：你说，尽管开口
**【3月1日 20:18】**

**张三**：资料都发你了，麻烦查收一下
**张三**：[图片]
**李四**：收到，我晚上看看
**李四**：[红包]辛苦费
**张三**：[转账]200:饭钱
**李四**：[语音]5
**张三**：太感谢了兄弟！`;

// ==================== JSON 数据格式（约定） ====================

interface WechatChatJson {
  version: 1;
  settings: PhoneSettings;
  users: ChatUser[];
  selfId: number | null;
  messages: ChatMessage[];
}

function exportToJson(
  users: ChatUser[],
  messages: ChatMessage[],
  settings: PhoneSettings,
  selfId: number | null,
): WechatChatJson {
  return {
    version: 1,
    settings: { ...settings },
    users: users.map(u => ({ ...u, avatar: null })),
    selfId,
    messages: messages.map(m => ({
      ...m,
      content: m.type === 'image' && m.content.startsWith('data:') ? '' : m.content,
    })),
  };
}

function importFromJson(json: WechatChatJson): {
  users: ChatUser[];
  messages: ChatMessage[];
  settings: PhoneSettings;
  selfId: number | null;
} {
  if (!json || typeof json !== 'object') throw new Error('JSON 格式错误');
  if (!Array.isArray(json.users) || !Array.isArray(json.messages)) {
    throw new Error('JSON 缺少 users 或 messages 字段');
  }
  let nextId = 1;
  const users: ChatUser[] = json.users.map(u => ({
    id: u.id ?? nextId++,
    name: String(u.name || '未命名'),
    avatar: null,
  }));
  const messages: ChatMessage[] = json.messages.map(m => ({
    id: m.id ?? nextId++,
    type: m.type || 'text',
    senderId: m.senderId ?? 1,
    content: String(m.content || ''),
    params: m.params || {},
  }));
  const settings: PhoneSettings = {
    time: json.settings?.time || '12:02',
    signal: json.settings?.signal ?? 4,
    battery: json.settings?.battery ?? 60,
    contactName: json.settings?.contactName || '',
    unreadCount: json.settings?.unreadCount ?? 1,
    selfBubbleColor: json.settings?.selfBubbleColor || '#95ec69',
    otherBubbleColor: json.settings?.otherBubbleColor || '#ffffff',
    theme: json.settings?.theme || 'ios_classic',
  };
  return { users, messages, settings, selfId: json.selfId ?? users[0]?.id ?? null };
}

// ==================== 反向序列化：当前数据 → Markdown ====================

function messagesToMarkdown(
  users: ChatUser[],
  messages: ChatMessage[],
  selfId: number | null,
): string {
  const lines: string[] = [];
  for (const msg of messages) {
    if (msg.type === 'time') {
      lines.push(`**【${msg.content}】**`);
      lines.push('');
      continue;
    }
    const user = users.find(u => u.id === msg.senderId);
    const name = user?.name || '?';
    const isSelf = msg.senderId === selfId;
    const displayName = isSelf ? '我' : name;
    let content = '';
    switch (msg.type) {
      case 'text':
        content = msg.content;
        break;
      case 'image':
        content = msg.content && !msg.content.startsWith('data:') ? `[图片]${msg.content}` : '[图片]';
        break;
      case 'redpacket':
        content = `[红包]${msg.params.remark || '恭喜发财，大吉大利'}`;
        break;
      case 'transfer':
        content = `[转账]${msg.params.amount || '0'}:${msg.params.remark || '转账'}`;
        break;
      case 'voice':
        content = `[语音]${msg.params.duration || 3}`;
        break;
    }
    lines.push(`**${displayName}**：${content}`);
  }
  return lines.join('\n');
}

// ==================== SVG 图标组件 ====================

function SignalIcon({ bars }: { bars: number }) {
  return (
    <svg width="54" height="36" viewBox="0 0 54 36" style={{ color: 'var(--wc-signal-color, #000)' }}>
      <rect x="0" y="27" width="9" height="9" rx="1.5" fill={bars >= 1 ? 'currentColor' : '#ccc'} />
      <rect x="13" y="20" width="9" height="16" rx="1.5" fill={bars >= 2 ? 'currentColor' : '#ccc'} />
      <rect x="26" y="12" width="9" height="24" rx="1.5" fill={bars >= 3 ? 'currentColor' : '#ccc'} />
      <rect x="39" y="3" width="9" height="33" rx="1.5" fill={bars >= 4 ? 'currentColor' : '#ccc'} />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="48" height="36" viewBox="0 0 24 18" fill="currentColor" style={{ color: 'var(--wc-signal-color, #000)' }}>
      <path d="M12 2C7.8 2 4 3.7 1.2 6.5l1.5 1.5C5 5.8 8.3 4.5 12 4.5s7 1.3 9.3 3.5l1.5-1.5C19.9 3.7 16.2 2 12 2z" />
      <path d="M12 7C9.1 7 6.5 8.1 4.6 10l1.5 1.5C7.8 9.8 9.8 9 12 9s4.2.8 5.9 2.5L19.4 10C17.5 8.1 14.9 7 12 7z" />
      <path d="M12 12c-1.7 0-3.2.7-4.3 1.8l1.5 1.5c.7-.8 1.7-1.3 2.8-1.3s2.1.5 2.8 1.3l1.5-1.5C15.2 12.7 13.7 12 12 12z" />
      <circle cx="12" cy="17" r="1.5" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="27" height="52" viewBox="0 0 27 52" fill="none">
      <path d="M25 2L3 26l22 24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--wc-text-color, #000)' }} />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="#999" stroke="none" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg className="wc-input-mic" viewBox="0 0 48 48" fill="none" stroke="#999" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 20v9a5 5 0 0 0 10 0v-9a5 5 0 0 0-10 0z" />
      <path d="M14 28c0 5.5 4.5 10 10 10s10-4.5 10-10" />
      <line x1="24" y1="38" x2="24" y2="42" />
    </svg>
  );
}

// 底部栏图标（语音/表情/加号）用 SVG 简化
function BottomVoiceIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--wc-icon-color, #333)' }}>
      <rect x="14" y="10" width="20" height="22" rx="10" />
      <path d="M10 28c0 8 6 14 14 14s14-6 14-14" />
      <line x1="24" y1="42" x2="24" y2="46" />
    </svg>
  );
}
function BottomEmojiIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--wc-icon-color, #333)' }}>
      <circle cx="24" cy="24" r="18" />
      <circle cx="18" cy="20" r="1.5" fill="currentColor" />
      <circle cx="30" cy="20" r="1.5" fill="currentColor" />
      <path d="M16 28c2 4 5 6 8 6s6-2 8-6" strokeLinecap="round" />
    </svg>
  );
}
function BottomPlusIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: 'var(--wc-icon-color, #333)' }}>
      <circle cx="24" cy="24" r="18" />
      <line x1="24" y1="16" x2="24" y2="32" />
      <line x1="16" y1="24" x2="32" y2="24" />
    </svg>
  );
}

// 编辑面板用图标（内联 SVG，避免引入 lucide-react）
const IconDownload = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>);
const IconCopy = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>);
const IconImage = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>);
const IconPlus = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
const IconTrash = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>);
const IconUp = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>);
const IconDown = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>);

// ==================== 微信预览子组件 ====================

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function TimeNotice({ content }: { content: string }) {
  return (
    <div className="wc-notice">
      <span className="wc-notice-bg">{content}</span>
    </div>
  );
}

function ChatBubble({
  msg,
  user,
  isSelf,
  isGroup,
  selfColor,
  otherColor,
  defaultAvatarSrc,
  onUpdateMessage,
}: {
  msg: ChatMessage;
  user: ChatUser;
  isSelf: boolean;
  isGroup: boolean;
  selfColor: string;
  otherColor: string;
  defaultAvatarSrc: string;
  onUpdateMessage?: (msgId: number, patch: Partial<Pick<ChatMessage, 'content' | 'params'>>) => void;
}) {
  const avatarSrc = user.avatar || defaultAvatarSrc;
  const bubbleColor = isSelf ? selfColor : otherColor;
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editField, setEditField] = useState<'content' | 'remark' | 'amount' | 'duration'>('content');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateMessage) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onUpdateMessage(msg.id, { content: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startEdit = (field: 'content' | 'remark' | 'amount' | 'duration') => {
    if (!onUpdateMessage) return;
    setEditField(field);
    if (field === 'content') setEditValue(msg.content);
    else if (field === 'remark') setEditValue(msg.params.remark || '');
    else if (field === 'amount') setEditValue(msg.params.amount || '');
    else if (field === 'duration') setEditValue(String(msg.params.duration || 3));
    setEditing(true);
  };

  const saveEdit = () => {
    if (!onUpdateMessage) {
      setEditing(false);
      return;
    }
    if (editField === 'content') {
      onUpdateMessage(msg.id, { content: editValue });
    } else if (editField === 'remark') {
      onUpdateMessage(msg.id, { params: { ...msg.params, remark: editValue } });
    } else if (editField === 'amount') {
      onUpdateMessage(msg.id, { params: { ...msg.params, amount: editValue } });
    } else if (editField === 'duration') {
      const d = parseInt(editValue, 10);
      if (!isNaN(d) && d > 0) {
        onUpdateMessage(msg.id, { params: { ...msg.params, duration: d } });
      }
    }
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  const renderEditor = (placeholder: string, isNumber = false) => (
    <div className="wc-bubble-editing" onClick={e => e.stopPropagation()}>
      <input
        className="wc-bubble-edit-input"
        type={isNumber ? 'number' : 'text'}
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
          }
        }}
        autoFocus
        placeholder={placeholder}
      />
      <div className="wc-bubble-edit-actions">
        <button className="wc-bubble-edit-btn" onClick={cancelEdit}>取消</button>
        <button className="wc-bubble-edit-btn save" onClick={saveEdit}>保存</button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (editing) {
      const placeholders: Record<typeof editField, string> = {
        content: '消息内容',
        remark: msg.type === 'redpacket' ? '红包备注' : '转账备注',
        amount: '转账金额',
        duration: '语音秒数',
      };
      return renderEditor(placeholders[editField], editField === 'duration');
    }
    switch (msg.type) {
      case 'text':
        return (
          <div className="wc-bubble" style={{ background: bubbleColor }} onClick={() => startEdit('content')}>
            <span className="wc-arrow" style={{ background: bubbleColor }} />
            <span dangerouslySetInnerHTML={{ __html: escHtml(msg.content).replace(/\n/g, '<br/>') }} />
          </div>
        );
      case 'image': {
        const hasImage = msg.content && !msg.content.includes('placeholder');
        return (
          <div
            className="wc-bubble wc-bubble-image"
            onClick={() => imgInputRef.current?.click()}
          >
            {hasImage ? (
              <img src={msg.content} alt="" />
            ) : (
              <div className="wc-img-placeholder">
                <ImageIcon />
                <span>点击上传图片</span>
              </div>
            )}
            <input ref={imgInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
          </div>
        );
      }
      case 'voice': {
        const dur = msg.params.duration || 2;
        const w = 180 + Math.min(dur * 30, 400);
        const barCount = Math.min(Math.max(3, Math.floor(dur / 1.5)), 8);
        const bars = Array.from({ length: barCount }, (_, i) => {
          const h = 12 + Math.round((i / barCount) * 30);
          return <span key={i} style={{ height: `${h}px` }} />;
        });
        return (
          <div
            className="wc-bubble wc-bubble-voice"
            style={{
              background: bubbleColor,
              width: `${w}px`,
              flexDirection: isSelf ? 'row-reverse' : 'row',
            }}
            onClick={() => startEdit('duration')}
          >
            <span className="wc-arrow" style={{ background: bubbleColor }} />
            {isSelf ? (
              <>
                <span className="wc-voice-dur">{dur}"</span>
                <div className="wc-voice-bars">{bars}</div>
              </>
            ) : (
              <>
                <div className="wc-voice-bars">{bars}</div>
                <span className="wc-voice-dur">{dur}"</span>
              </>
            )}
          </div>
        );
      }
      case 'redpacket':
        return (
          <div className="wc-bubble wc-bubble-redpacket">
            <span className="wc-arrow" style={{ background: '#f79c46' }} />
            <div className="wc-rp-content">
              <div className="wc-rp-icon">🧧</div>
              <div className="wc-rp-info" onClick={() => startEdit('remark')} style={{ cursor: 'text' }}>
                <span>{escHtml(msg.params.remark || '恭喜发财，大吉大利')}</span>
              </div>
            </div>
            <div className="wc-rp-bottom">
              <span>微信红包</span>
            </div>
          </div>
        );
      case 'transfer':
        return (
          <div className="wc-bubble wc-bubble-transfer">
            <span className="wc-arrow" style={{ background: '#f79c46' }} />
            <div className="wc-rp-content">
              <div className="wc-rp-icon">💰</div>
              <div className="wc-rp-info">
                <span onClick={() => startEdit('amount')} style={{ cursor: 'text' }}>¥{parseFloat(msg.params.amount || '0').toFixed(2)}</span>
                <small onClick={() => startEdit('remark')} style={{ cursor: 'text' }}>{escHtml(msg.params.remark || '转账')}</small>
              </div>
            </div>
            <div className="wc-rp-bottom">
              <span>微信转账</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`wc-dialog ${isSelf ? 'wc-dialog-right' : ''}`}>
      <div className="wc-face">
        <img src={avatarSrc} alt={user.name} />
      </div>
      <div className="wc-body">
        {!isSelf && isGroup && <div className="wc-nick">{user.name}</div>}
        {renderContent()}
      </div>
    </div>
  );
}

function PhonePreview({
  users,
  messages,
  settings,
  selfId,
  phoneRef,
  defaultAvatarSrc,
  onUpdateMessage,
}: {
  users: ChatUser[];
  messages: ChatMessage[];
  settings: PhoneSettings;
  selfId: number | null;
  phoneRef: React.RefObject<HTMLDivElement | null>;
  defaultAvatarSrc: string;
  onUpdateMessage?: (msgId: number, patch: Partial<Pick<ChatMessage, 'content' | 'params'>>) => void;
}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const isGroup = users.length > 2;
  return (
    <div className="wc-phone-scale-wrap">
      <div className="wc-phone-wrap">
        <div className="wc-phone-content">
          <div className={`wc-phone ${THEME_PRESETS[settings.theme]?.className || 'wc-theme-ios-classic'}`} ref={phoneRef as React.RefObject<HTMLDivElement>} style={{ '--wc-self-bubble': settings.selfBubbleColor, '--wc-other-bubble': settings.otherBubbleColor } as React.CSSProperties}>
            {/* 状态栏 */}
            <div className="wc-phone-top">
              <div className="wc-status-bar">
                <div className="wc-time">{settings.time}</div>
                <div className="wc-signal-group">
                  <SignalIcon bars={settings.signal} />
                  <WifiIcon />
                </div>
                <div className="wc-battery-wrap">
                  <div className="wc-battery-outer">
                    <div className="wc-battery-inner" style={{ width: `${settings.battery}%` }} />
                  </div>
                  <div className="wc-battery-tip" />
                </div>
              </div>
              {/* 导航栏 */}
              <div className="wc-nav">
                <div className="wc-nav-left">
                  <BackIcon />
                  {settings.unreadCount > 0 && <span className="wc-nav-badge">{settings.unreadCount}</span>}
                </div>
                <div className="wc-nav-center">
                  <span>{settings.contactName || '对方'}</span>
                </div>
                <div className="wc-nav-right">
                  <div className="wc-nav-dots">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </div>
            </div>
            {/* 聊天主体 */}
            <div className="wc-chat-body" ref={bodyRef}>
              <div className="wc-chat-content">
                {messages.map(msg => {
                  if (msg.type === 'time') {
                    return <TimeNotice key={msg.id} content={msg.content} />;
                  }
                  const userIndex = users.findIndex(u => u.id === msg.senderId);
                  const user = users[userIndex] || users[0];
                  const isSelf = msg.senderId === selfId;
                  return (
                    <ChatBubble
                      key={msg.id}
                      msg={msg}
                      user={user}
                      isSelf={isSelf}
                      isGroup={isGroup}
                      selfColor={settings.selfBubbleColor}
                      otherColor={settings.otherBubbleColor}
                      defaultAvatarSrc={defaultAvatarSrc}
                      onUpdateMessage={onUpdateMessage}
                    />
                  );
                })}
              </div>
            </div>
            {/* 底部输入栏 */}
            <div className="wc-bottom">
              <div className="wc-bottom-chat">
                <div className="wc-bottom-inner">
                  <div className="wc-bottom-icon">
                    <BottomVoiceIcon />
                  </div>
                  <div className="wc-input-box">
                    <MicIcon />
                  </div>
                  <div className="wc-bottom-icon">
                    <BottomEmojiIcon />
                  </div>
                  <div className="wc-bottom-icon">
                    <BottomPlusIcon />
                  </div>
                </div>
              </div>
              <div className="wc-home-indicator">
                <i />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 编辑面板子组件 ====================

// 「当前数据」面板：实时显示当前聊天记录的 Markdown / JSON 双视图，可切换、可编辑、可应用回主状态
function CurrentDataPanel({
  users,
  messages,
  settings,
  selfId,
  onApplyMarkdown,
  onApplyJson,
  showToast,
}: {
  users: ChatUser[];
  messages: ChatMessage[];
  settings: PhoneSettings;
  selfId: number | null;
  onApplyMarkdown: (text: string) => void;
  onApplyJson: (jsonText: string) => void;
  showToast: (msg: string) => void;
}) {
  const [view, setView] = useState<'markdown' | 'json'>('markdown');
  const [editText, setEditText] = useState('');
  const [editing, setEditing] = useState(false);

  // 当前数据的 Markdown / JSON 字符串
  const markdownText = React.useMemo(
    () => messagesToMarkdown(users, messages, selfId),
    [users, messages, selfId],
  );
  const jsonText = React.useMemo(
    () => JSON.stringify(exportToJson(users, messages, settings, selfId), null, 2),
    [users, messages, settings, selfId],
  );

  const displayText = view === 'markdown' ? markdownText : jsonText;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText).then(
      () => showToast('已复制到剪贴板'),
      () => showToast('复制失败'),
    );
  };

  const handleDownload = () => {
    const blob = new Blob([displayText], { type: view === 'markdown' ? 'text/markdown' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = view === 'markdown'
      ? '微信聊天记录_' + Date.now() + '.md'
      : '微信聊天记录_' + Date.now() + '.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast('已下载');
  };

  const handleStartEdit = () => {
    setEditText(displayText);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditText('');
  };

  const handleApply = () => {
    try {
      if (view === 'markdown') {
        onApplyMarkdown(editText);
      } else {
        onApplyJson(editText);
      }
      setEditing(false);
      setEditText('');
    } catch (e) {
      showToast('应用失败：' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleSwapView = (newView: 'markdown' | 'json') => {
    if (editing) {
      // 切换视图前先取消编辑
      setEditing(false);
      setEditText('');
    }
    setView(newView);
  };

  return (
    <div className="wc-card">
      <div className="wc-card-header">
        <IconImage /> 当前数据
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>
          {messages.length} 条消息 · {users.length} 个用户
        </span>
      </div>
      <div className="wc-card-body">
        <div className="wc-input-mode-tabs">
          <button
            className={`wc-input-mode-tab ${view === 'markdown' ? 'active' : ''}`}
            onClick={() => handleSwapView('markdown')}
          >
            Markdown 视图
          </button>
          <button
            className={`wc-input-mode-tab ${view === 'json' ? 'active' : ''}`}
            onClick={() => handleSwapView('json')}
          >
            JSON 视图
          </button>
        </div>
        {!editing ? (
          <pre
            style={{
              margin: 0,
              padding: 12,
              background: 'rgba(0,0,0,0.03)',
              borderRadius: 6,
              fontSize: 12,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              maxHeight: 320,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: 'var(--arco-color-text-1, #000)',
              border: '1px solid var(--arco-color-border-2, #e5e5e5)',
            }}
          >
            {displayText || '(空)'}
          </pre>
        ) : (
          <textarea
            className="wc-textarea"
            style={{ minHeight: 240, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            autoFocus
          />
        )}
        <div className="wc-json-actions">
          {!editing ? (
            <>
              <button className="wc-btn wc-btn-sm" onClick={handleCopy}>
                <IconCopy /> 复制
              </button>
              <button className="wc-btn wc-btn-sm" onClick={handleDownload}>
                <IconDownload /> 下载
              </button>
              <button className="wc-btn wc-btn-sm" onClick={handleStartEdit}>
                <IconPlus /> 编辑并应用
              </button>
            </>
          ) : (
            <>
              <button className="wc-btn wc-btn-primary wc-btn-sm" onClick={handleApply}>
                应用到预览
              </button>
              <button className="wc-btn wc-btn-sm" onClick={handleCancelEdit}>
                取消
              </button>
              <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
                {view === 'markdown' ? '编辑后点击「应用到预览」会替换当前所有消息' : '编辑后点击「应用到预览」会替换当前所有数据（含设置/用户）'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ImportPanel({
  text,
  onTextChange,
  onImport,
}: {
  text: string;
  onTextChange: (t: string) => void;
  onImport: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onTextChange(ev.target?.result as string);
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="wc-card">
      <div className="wc-card-header">
        <IconImage /> 导入聊天记录
      </div>
      <div className="wc-card-body">
        <div className="wc-format-tip">
          <strong>支持的格式：</strong>
          <br />
          文字消息：<code>**用户名**：消息内容</code>
          <br />
          图片消息：<code>**用户名**：[图片]</code> 或 <code>**用户名**：[图片]URL</code>
          <br />
          红包消息：<code>**用户名**：[红包]备注</code>
          <br />
          转账消息：<code>**用户名**：[转账]金额:备注</code>
          <br />
          语音消息：<code>**用户名**：[语音]秒数</code>
          <br />
          时间节点：<code>**【3月1日 14:32】**</code>
          <br />
          <div style={{ marginTop: 6, color: '#9ca3af' }}>
            标题行(#)、引用行(&gt;)、空行自动跳过。第一个出现的用户默认为"自己"。图片不带URL时可在预览中点击上传本地图片。
          </div>
        </div>
        <div className="wc-btn-row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.markdown"
            hidden
            onChange={handleFileLoad}
          />
          <button className="wc-btn wc-btn-sm" onClick={() => fileInputRef.current?.click()}>
            <IconImage /> 导入文件
          </button>
          <button className="wc-btn wc-btn-sm" onClick={() => onTextChange(EXAMPLE_TEXT)}>
            加载示例
          </button>
        </div>
        <textarea
          className="wc-textarea"
          value={text}
          onChange={e => onTextChange(e.target.value)}
          placeholder="在此粘贴聊天记录文本，或点击上方按钮导入文件..."
        />
        <div className="wc-btn-row">
          <button className="wc-btn wc-btn-primary" onClick={onImport} disabled={!text.trim()}>
            <IconPlus /> 解析并导入
          </button>
          <button className="wc-btn wc-btn-sm" onClick={() => onTextChange('')} disabled={!text}>
            <IconTrash /> 清空
          </button>
        </div>
      </div>
    </div>
  );
}

function UserAvatarManager({
  users,
  selfId,
  defaultAvatarSrc,
  onUpdateAvatar,
  onRemoveAvatar,
  onSetSelf,
  onAddUser,
}: {
  users: ChatUser[];
  selfId: number | null;
  defaultAvatarSrc: string;
  onUpdateAvatar: (userId: number, avatar: string) => void;
  onRemoveAvatar: (userId: number) => void;
  onSetSelf: (userId: number) => void;
  onAddUser?: (name: string) => void;
}) {
  const [newUserName, setNewUserName] = useState('');
  const handleAdd = () => {
    const name = newUserName.trim();
    if (!name) return;
    onAddUser?.(name);
    setNewUserName('');
  };
  return (
    <div className="wc-card">
      <div className="wc-card-header">
        <IconImage /> 用户管理
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{users.length} 个用户</span>
      </div>
      <div className="wc-card-body">
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>鼠标悬停头像可上传自定义图片，点击「设为自己」切换左右方向</p>
        <div className="wc-avatar-grid">
          {users.map((user) => (
            <AvatarCard
              key={user.id}
              user={user}
              isSelf={user.id === selfId}
              defaultAvatarSrc={defaultAvatarSrc}
              onUpdateAvatar={onUpdateAvatar}
              onRemoveAvatar={onRemoveAvatar}
              onSetSelf={onSetSelf}
            />
          ))}
        </div>
        {onAddUser && (
          <div className="wc-me-row" style={{ marginTop: 8 }}>
            <input
              className="wc-me-input"
              type="text"
              placeholder="新用户昵称"
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              style={{ flex: 1 }}
            />
            <button className="wc-btn wc-btn-sm" onClick={handleAdd} disabled={!newUserName.trim()}>
              <IconPlus /> 添加用户
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AvatarCard({
  user,
  isSelf,
  defaultAvatarSrc,
  onUpdateAvatar,
  onRemoveAvatar,
  onSetSelf,
}: {
  user: ChatUser;
  isSelf: boolean;
  defaultAvatarSrc: string;
  onUpdateAvatar: (userId: number, avatar: string) => void;
  onRemoveAvatar: (userId: number) => void;
  onSetSelf: (userId: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarSrc = user.avatar || defaultAvatarSrc;
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onUpdateAvatar(user.id, ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  return (
    <div className="wc-avatar-card">
      <div className="wc-avatar-img-wrap">
        <img src={avatarSrc} alt={user.name} />
        <div className="wc-avatar-overlay" onClick={() => fileRef.current?.click()}>
          <IconImage />
        </div>
        {user.avatar && (
          <button
            className="wc-avatar-remove"
            onClick={() => onRemoveAvatar(user.id)}
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
      </div>
      <span className="wc-avatar-name">{user.name}</span>
      {isSelf ? (
        <span className="wc-avatar-tag">自己</span>
      ) : (
        <button className="wc-avatar-set-self" onClick={() => onSetSelf(user.id)}>
          设为自己
        </button>
      )}
    </div>
  );
}

function MessageEditor({
  users,
  selfId,
  onAddMessage,
}: {
  users: ChatUser[];
  selfId: number | null;
  onAddMessage: (msg: Omit<ChatMessage, 'id'>) => void;
}) {
  const [msgType, setMsgType] = useState<MessageType>('text');
  const [senderId, setSenderId] = useState<number | ''>(selfId ?? '');
  const [textContent, setTextContent] = useState('');
  const [remark, setRemark] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('3');
  const [timeContent, setTimeContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAdd = () => {
    if (msgType === 'time') {
      if (!timeContent.trim()) return;
      onAddMessage({ type: 'time', senderId: selfId ?? 1, content: timeContent.trim(), params: {} });
      setTimeContent('');
      return;
    }
    if (!senderId) return;
    switch (msgType) {
      case 'text':
        if (!textContent.trim()) return;
        onAddMessage({ type: 'text', senderId: senderId as number, content: textContent.trim(), params: {} });
        setTextContent('');
        break;
      case 'image':
        onAddMessage({ type: 'image', senderId: senderId as number, content: imagePreview || '', params: {} });
        setImagePreview(null);
        break;
      case 'redpacket':
        onAddMessage({
          type: 'redpacket',
          senderId: senderId as number,
          content: '',
          params: { remark: remark || '恭喜发财，大吉大利' },
        });
        setRemark('');
        break;
      case 'transfer':
        onAddMessage({
          type: 'transfer',
          senderId: senderId as number,
          content: '',
          params: { amount: amount || '0', remark: remark || '转账' },
        });
        setAmount('');
        setRemark('');
        break;
      case 'voice':
        onAddMessage({
          type: 'voice',
          senderId: senderId as number,
          content: '',
          params: { duration: parseInt(duration || '3', 10) },
        });
        setDuration('3');
        break;
    }
  };

  const MSG_TYPES: { type: MessageType; label: string }[] = [
    { type: 'text', label: '文字' },
    { type: 'image', label: '图片' },
    { type: 'redpacket', label: '红包' },
    { type: 'transfer', label: '转账' },
    { type: 'voice', label: '语音' },
    { type: 'time', label: '时间' },
  ];

  const renderFields = () => {
    if (msgType === 'time') {
      return (
        <input
          className="wc-me-input"
          type="text"
          placeholder="如：3月15日 下午14:00"
          value={timeContent}
          onChange={e => setTimeContent(e.target.value)}
        />
      );
    }
    return (
      <>
        <select
          className="wc-me-select"
          value={senderId}
          onChange={e => setSenderId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">选择发送人</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.id === selfId ? '（自己）' : ''}
            </option>
          ))}
        </select>
        {msgType === 'text' && (
          <textarea
            className="wc-me-input wc-me-textarea"
            placeholder="输入消息内容..."
            value={textContent}
            onChange={e => setTextContent(e.target.value)}
            rows={2}
          />
        )}
        {msgType === 'image' && (
          <div>
            {imagePreview ? (
              <div className="wc-me-img-preview">
                <img src={imagePreview} alt="" />
                <button className="wc-me-img-remove" onClick={() => setImagePreview(null)}>×</button>
              </div>
            ) : (
              <button className="wc-me-img-upload" onClick={() => imgRef.current?.click()}>
                <IconImage />
                <span>选择图片</span>
              </button>
            )}
            <input ref={imgRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
          </div>
        )}
        {msgType === 'redpacket' && (
          <input
            className="wc-me-input"
            type="text"
            placeholder="红包备注（默认：恭喜发财，大吉大利）"
            value={remark}
            onChange={e => setRemark(e.target.value)}
          />
        )}
        {msgType === 'transfer' && (
          <div className="wc-me-row">
            <input
              className="wc-me-input"
              type="text"
              placeholder="金额"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              className="wc-me-input"
              type="text"
              placeholder="备注（默认：转账）"
              value={remark}
              onChange={e => setRemark(e.target.value)}
              style={{ flex: 2 }}
            />
          </div>
        )}
        {msgType === 'voice' && (
          <div className="wc-me-row">
            <input
              className="wc-me-input"
              type="number"
              min={1}
              max={60}
              placeholder="语音秒数"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              style={{ width: 100 }}
            />
            <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>秒</span>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="wc-card">
      <div className="wc-card-header">
        <IconPlus /> 添加消息
      </div>
      <div className="wc-card-body">
        <div className="wc-me-type-tabs">
          {MSG_TYPES.map(t => (
            <button
              key={t.type}
              className={`wc-me-type-tab ${msgType === t.type ? 'active' : ''}`}
              onClick={() => setMsgType(t.type)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {renderFields()}
        <button className="wc-btn wc-btn-primary wc-btn-sm" onClick={handleAdd}>
          <IconPlus /> 添加
        </button>
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  onSettingsChange,
}: {
  settings: PhoneSettings;
  onSettingsChange: (s: PhoneSettings) => void;
}) {
  const update = (patch: Partial<PhoneSettings>) => onSettingsChange({ ...settings, ...patch });

  const applyTheme = (themeKey: string) => {
    const preset = THEME_PRESETS[themeKey];
    if (!preset) return;
    onSettingsChange({
      ...settings,
      theme: themeKey,
      selfBubbleColor: preset.selfBubble,
      otherBubbleColor: preset.otherBubble,
    });
  };

  return (
    <div className="wc-card">
      <div className="wc-card-header">
        <IconImage /> 外观设置
      </div>
      <div className="wc-card-body">
        <div className="wc-form-item" style={{ marginBottom: 12 }}>
          <label className="wc-form-label">主题预设</label>
          <div className="wc-theme-selector">
            {Object.entries(THEME_PRESETS).map(([key, preset]) => (
              <div
                key={key}
                className={`wc-theme-option ${settings.theme === key ? 'active' : ''}`}
                onClick={() => applyTheme(key)}
              >
                <div className="wc-theme-swatch">
                  <span style={{ background: preset.swatch[0] }} />
                  <span style={{ background: preset.swatch[1] }} />
                  <span style={{ background: preset.swatch[2] }} />
                </div>
                <span>{preset.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="wc-form-grid">
          <div className="wc-form-item">
            <label className="wc-form-label">手机时间</label>
            <input
              type="time"
              className="wc-form-input"
              value={settings.time}
              onChange={e => update({ time: e.target.value })}
            />
          </div>
          <div className="wc-form-item">
            <label className="wc-form-label">聊天标题</label>
            <input
              type="text"
              className="wc-form-input"
              value={settings.contactName}
              onChange={e => update({ contactName: e.target.value })}
            />
          </div>
          <div className="wc-form-item">
            <label className="wc-form-label">信号格数</label>
            <select
              className="wc-form-input"
              value={settings.signal}
              onChange={e => update({ signal: parseInt(e.target.value) })}
            >
              <option value={1}>1格</option>
              <option value={2}>2格</option>
              <option value={3}>3格</option>
              <option value={4}>4格</option>
            </select>
          </div>
          <div className="wc-form-item">
            <label className="wc-form-label">未读消息</label>
            <input
              type="number"
              className="wc-form-input"
              min={0}
              max={99}
              value={settings.unreadCount}
              onChange={e => update({ unreadCount: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="wc-form-item">
            <label className="wc-form-label">电量 {settings.battery}%</label>
            <input
              type="range"
              className="wc-form-range"
              min={0}
              max={100}
              value={settings.battery}
              onChange={e => update({ battery: parseInt(e.target.value) })}
            />
          </div>
          <div className="wc-form-item">
            <label className="wc-form-label">自己气泡色</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color"
                className="wc-form-color"
                value={settings.selfBubbleColor}
                onChange={e => update({ selfBubbleColor: e.target.value })}
              />
              <span style={{ fontSize: 12, color: '#6b7280' }}>{settings.selfBubbleColor}</span>
            </div>
          </div>
          <div className="wc-form-item">
            <label className="wc-form-label">他人气泡色</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color"
                className="wc-form-color"
                value={settings.otherBubbleColor}
                onChange={e => update({ otherBubbleColor: e.target.value })}
              />
              <span style={{ fontSize: 12, color: '#6b7280' }}>{settings.otherBubbleColor}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageList({
  messages,
  users,
  selfId,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  messages: ChatMessage[];
  users: ChatUser[];
  selfId: number | null;
  onDelete: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
}) {
  if (messages.length === 0) return null;
  const typeLabel: Record<MessageType, string> = {
    text: '文字',
    image: '图片',
    voice: '语音',
    redpacket: '红包',
    transfer: '转账',
    time: '时间',
  };
  const previewText = (msg: ChatMessage): string => {
    switch (msg.type) {
      case 'text':
        return msg.content;
      case 'image':
        return msg.content ? '[已上传图片]' : '[占位图片]';
      case 'voice':
        return `[语音] ${msg.params.duration || 3}"`;
      case 'redpacket':
        return `[红包] ${msg.params.remark || ''}`;
      case 'transfer':
        return `[转账] ¥${msg.params.amount || 0} ${msg.params.remark || ''}`;
      case 'time':
        return msg.content;
      default:
        return '';
    }
  };
  return (
    <div className="wc-card">
      <div className="wc-card-header">
        <IconImage /> 消息列表
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{messages.length} 条</span>
      </div>
      <div className="wc-card-body">
        <div className="wc-msg-list">
          {messages.map((msg, idx) => {
            const user = users.find(u => u.id === msg.senderId) || users[0];
            const isSelf = msg.senderId === selfId;
            return (
              <div key={msg.id} className="wc-msg-item">
                <div className="wc-msg-meta">
                  <span className="wc-msg-sender">
                    [{typeLabel[msg.type]}] {user?.name || '?'}
                    {isSelf ? '（自己）' : ''}
                  </span>
                  <span className="wc-msg-preview">{previewText(msg)}</span>
                </div>
                <div className="wc-msg-actions">
                  <button
                    className="wc-msg-action-btn up"
                    onClick={() => onMoveUp(msg.id)}
                    disabled={idx === 0}
                    style={{ opacity: idx === 0 ? 0.4 : 1 }}
                    title="上移"
                  >
                    <IconUp />
                  </button>
                  <button
                    className="wc-msg-action-btn up"
                    onClick={() => onMoveDown(msg.id)}
                    disabled={idx === messages.length - 1}
                    style={{ opacity: idx === messages.length - 1 ? 0.4 : 1 }}
                    title="下移"
                  >
                    <IconDown />
                  </button>
                  <button
                    className="wc-msg-action-btn"
                    onClick={() => onDelete(msg.id)}
                    title="删除"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export default function WechatChat() {
  const [importText, setImportText] = useState('');
  // 默认提供「我」和「对方」两个用户，让用户一进来就能直接添加消息，不需要先导入
  const [users, setUsers] = useState<ChatUser[]>(() => [
    { id: 1, name: '我', avatar: null },
    { id: 2, name: '对方', avatar: null },
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [settings, setSettings] = useState<PhoneSettings>({
    time: '12:02',
    signal: 4,
    battery: 60,
    contactName: '',
    unreadCount: 1,
    selfBubbleColor: '#95ec69',
    otherBubbleColor: '#ffffff',
    theme: 'ios_classic',
  });
  const [selfId, setSelfId] = useState<number | null>(1);
  const [toast, setToast] = useState('');
  const phoneRef = useRef<HTMLDivElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2500);
  }, []);

  const handleImport = useCallback(() => {
    if (!importText.trim()) {
      showToast('请先输入聊天记录文本');
      return;
    }
    const result = parseChatRecord(importText);
    if (result.messages.length === 0) {
      showToast('未解析到任何消息');
      return;
    }
    setUsers(result.users);
    setMessages(result.messages);
    setSelfId(result.users[0]?.id ?? null);
    if (result.users.length >= 3) {
      const otherNames = result.users.slice(1).map(u => u.name);
      const nameStr = result.users.length <= 4
        ? otherNames.join('、')
        : otherNames.slice(0, 2).join('、') + '等';
      setSettings(s => ({ ...s, contactName: nameStr + '(' + result.users.length + ')' }));
    } else if (result.users.length === 2) {
      setSettings(s => ({ ...s, contactName: result.users[1].name }));
    } else if (result.users.length === 1) {
      setSettings(s => ({ ...s, contactName: result.users[0].name }));
    }
    showToast(`成功导入 ${result.messages.length} 条消息（${result.users.length} 个用户）`);
  }, [importText, showToast]);

  const handleUpdateAvatar = useCallback((userId: number, avatar: string) => {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, avatar } : u)));
  }, []);
  const handleRemoveAvatar = useCallback((userId: number) => {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, avatar: null } : u)));
  }, []);
  const handleUpdateMessage = useCallback((msgId: number, patch: Partial<Pick<ChatMessage, 'content' | 'params'>>) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      return {
        ...m,
        content: patch.content !== undefined ? patch.content : m.content,
        params: patch.params !== undefined ? { ...m.params, ...patch.params } : m.params,
      };
    }));
  }, []);
  const handleAddMessage = useCallback((msg: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => {
      const maxId = prev.reduce((max, m) => Math.max(max, m.id), 0);
      return [...prev, { ...msg, id: maxId + 1 }];
    });
  }, []);
  const handleDeleteMessage = useCallback((id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);
  const handleMoveUp = useCallback((id: number) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);
  const handleMoveDown = useCallback((id: number) => {
    setMessages(prev => {
      const idx = prev.findIndex(m => m.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      return next;
    });
  }, []);

  // html-to-image 截图（基于浏览器自身渲染，无文字偏移问题）
  const capturePhone = useCallback(async (longshot = false): Promise<HTMLCanvasElement | null> => {
    const phone = phoneRef.current;
    if (!phone) return null;
    const content = phone.closest('.wc-phone-content') as HTMLElement | null;
    const wrap = phone.closest('.wc-phone-wrap') as HTMLElement | null;
    const scaleWrap = phone.closest('.wc-phone-scale-wrap') as HTMLElement | null;
    if (!content || !wrap) return null;
    // 保存原始样式
    const saved = {
      ct: content.style.transform,
      co: content.style.transformOrigin,
      ww: wrap.style.width,
      wh: wrap.style.height,
      wo: wrap.style.overflow,
      wr: wrap.style.borderRadius,
      ws: wrap.style.boxShadow,
      sp: scaleWrap?.style.position ?? '',
      st: scaleWrap?.style.top ?? '',
      sl: scaleWrap?.style.left ?? '',
      sw: scaleWrap?.style.width ?? '',
      sh: scaleWrap?.style.height ?? '',
    };
    const chatBody = phone.querySelector('.wc-chat-body') as HTMLElement | null;
    const chatContent = phone.querySelector('.wc-chat-content') as HTMLElement | null;
    const scrollTop = chatBody?.scrollTop ?? 0;
    const savedContentMargin = chatContent?.style.marginTop ?? '';
    // 移除缩放，展开至原始尺寸
    content.style.transform = 'none';
    wrap.style.width = '1125px';
    wrap.style.height = '2436px';
    wrap.style.overflow = 'hidden';
    wrap.style.borderRadius = '0';
    wrap.style.boxShadow = 'none';
    if (scaleWrap) {
      scaleWrap.style.position = 'fixed';
      scaleWrap.style.top = '0';
      scaleWrap.style.left = '-9999px';
      scaleWrap.style.width = '1125px';
      scaleWrap.style.height = '2436px';
    }
    // 普通截图: 用 margin-top 偏移模拟滚动
    if (!longshot && chatContent && scrollTop > 0) {
      chatContent.style.marginTop = `-${scrollTop}px`;
    }
    // 长截图: 释放 chat body 滚动
    let longOrig: Record<string, string> | null = null;
    if (longshot) {
      const bottom = phone.querySelector('.wc-bottom') as HTMLElement;
      if (chatBody && bottom) {
        longOrig = {
          ph: phone.style.height,
          po: phone.style.overflow,
          bp: chatBody.style.position,
          bt: chatBody.style.top,
          bb: chatBody.style.bottom,
          bo: chatBody.style.overflowY,
          bh: chatBody.style.height,
          dp: bottom.style.position,
          db: bottom.style.bottom,
        };
        phone.style.height = 'auto';
        phone.style.overflow = 'visible';
        wrap.style.height = 'auto';
        chatBody.style.position = 'relative';
        chatBody.style.top = 'auto';
        chatBody.style.bottom = 'auto';
        chatBody.style.overflowY = 'visible';
        chatBody.style.height = 'auto';
        bottom.style.position = 'relative';
        bottom.style.bottom = 'auto';
      }
    }
    await new Promise(r => setTimeout(r, 50));
    const totalH = longshot ? phone.scrollHeight : 2436;
    let canvas: HTMLCanvasElement | null = null;
    try {
      canvas = await toCanvas(phone, {
        width: 1125,
        height: totalH,
        pixelRatio: 1,
        backgroundColor: '#ededed',
      });
    } finally {
      // 还原所有样式
      content.style.transform = saved.ct;
      content.style.transformOrigin = saved.co;
      wrap.style.width = saved.ww;
      wrap.style.height = saved.wh;
      wrap.style.overflow = saved.wo;
      wrap.style.borderRadius = saved.wr;
      wrap.style.boxShadow = saved.ws;
      if (scaleWrap) {
        scaleWrap.style.position = saved.sp;
        scaleWrap.style.top = saved.st;
        scaleWrap.style.left = saved.sl;
        scaleWrap.style.width = saved.sw;
        scaleWrap.style.height = saved.sh;
      }
      if (chatContent) chatContent.style.marginTop = savedContentMargin;
      if (chatBody && scrollTop > 0) {
        requestAnimationFrame(() => {
          if (chatBody) chatBody.scrollTop = scrollTop;
        });
      }
      if (longshot && longOrig) {
        const cb = phone.querySelector('.wc-chat-body') as HTMLElement;
        const bt = phone.querySelector('.wc-bottom') as HTMLElement;
        if (cb && bt) {
          phone.style.height = longOrig.ph;
          phone.style.overflow = longOrig.po;
          cb.style.position = longOrig.bp;
          cb.style.top = longOrig.bt;
          cb.style.bottom = longOrig.bb;
          cb.style.overflowY = longOrig.bo;
          cb.style.height = longOrig.bh;
          bt.style.position = longOrig.dp;
          bt.style.bottom = longOrig.db;
        }
      }
    }
    return canvas;
  }, []);

  const handleGenerateImage = useCallback(async () => {
    if (!phoneRef.current) return;
    showToast('正在生成图片...');
    try {
      const canvas = await capturePhone(false);
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = '微信聊天记录_' + Date.now() + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('图片已生成并下载！');
    } catch (e: unknown) {
      showToast('生成失败：' + (e instanceof Error ? e.message : String(e)));
    }
  }, [showToast, capturePhone]);

  const handleCopyImage = useCallback(async () => {
    if (!phoneRef.current) return;
    showToast('正在生成图片...');
    try {
      const canvas = await capturePhone(false);
      if (!canvas) return;
      canvas.toBlob(async blob => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          showToast('图片已复制到剪贴板！');
        } catch {
          showToast('复制失败，请使用下载功能');
        }
      });
    } catch {
      showToast('操作失败');
    }
  }, [showToast, capturePhone]);

  const handleGenerateLongImage = useCallback(async () => {
    if (!phoneRef.current) return;
    showToast('正在生成长截图...');
    try {
      const canvas = await capturePhone(true);
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = '微信聊天记录_长截图_' + Date.now() + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('长截图已生成并下载！');
    } catch (e: unknown) {
      showToast('生成失败：' + (e instanceof Error ? e.message : String(e)));
    }
  }, [showToast, capturePhone]);

  const handleExportJson = useCallback(() => {
    if (messages.length === 0) {
      showToast('没有消息可导出');
      return;
    }
    const data = exportToJson(users, messages, settings, selfId);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = '微信聊天记录_' + Date.now() + '.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast('JSON 已导出');
  }, [users, messages, settings, selfId, showToast]);

  const jsonImportRef = useRef<HTMLInputElement>(null);
  const handleImportJson = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const result = importFromJson(json);
        if (result.messages.length === 0) {
          showToast('JSON 中没有消息');
          return;
        }
        setUsers(result.users);
        setMessages(result.messages);
        setSettings(result.settings);
        setSelfId(result.selfId);
        showToast(`成功导入 ${result.messages.length} 条消息`);
      } catch (err) {
        showToast('JSON 解析失败：' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [showToast]);

  // 「当前数据」面板 - 应用 Markdown：直接接收面板里编辑过的 Markdown 文本，覆盖当前状态
  const applyMarkdownFromPanel = useCallback((text: string) => {
    try {
      const result = parseChatRecord(text);
      if (result.messages.length === 0) {
        showToast('未解析到任何消息');
        return;
      }
      setUsers(result.users);
      setMessages(result.messages);
      setSelfId(result.users[0]?.id ?? null);
      if (result.users.length >= 3) {
        const otherNames = result.users.slice(1).map(u => u.name);
        const nameStr = result.users.length <= 4
          ? otherNames.join('、')
          : otherNames.slice(0, 2).join('、') + '等';
        setSettings(s => ({ ...s, contactName: nameStr + '(' + result.users.length + ')' }));
      } else if (result.users.length === 2) {
        setSettings(s => ({ ...s, contactName: result.users[1].name }));
      } else if (result.users.length === 1) {
        setSettings(s => ({ ...s, contactName: result.users[0].name }));
      }
      showToast(`已应用 Markdown（${result.messages.length} 条消息）`);
    } catch (err) {
      showToast('Markdown 解析失败：' + (err instanceof Error ? err.message : String(err)));
    }
  }, [showToast]);

  // 「当前数据」面板 - 应用 JSON：直接接收面板里编辑过的 JSON 文本，覆盖整个状态
  const applyJsonFromPanel = useCallback((jsonText: string) => {
    try {
      const json = JSON.parse(jsonText);
      const result = importFromJson(json);
      setUsers(result.users);
      setMessages(result.messages);
      setSettings(result.settings);
      setSelfId(result.selfId);
      showToast(`已应用 JSON（${result.messages.length} 条消息）`);
    } catch (err) {
      showToast('JSON 解析失败：' + (err instanceof Error ? err.message : String(err)));
    }
  }, [showToast]);

  // 「用户管理」面板 - 添加新用户（空状态下也能直接添加，不必先导入）
  const handleAddUser = useCallback((name: string) => {
    setUsers(prev => {
      const maxId = prev.reduce((max, u) => Math.max(max, u.id), 0);
      return [...prev, { id: maxId + 1, name, avatar: null }];
    });
    showToast(`已添加用户「${name}」`);
  }, [showToast]);

  const hasMessages = messages.length > 0;

  return (
    <div className="wc-page">
      <div className="wc-header">
        <h1>微信聊天记录生成</h1>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          · HTML/CSS 渲染 + html-to-image 截图（参考 bairihai/wechat-dialog-generator）
        </span>
        <div className="wc-header-actions">
          <button
            className="wc-btn wc-btn-primary wc-btn-sm"
            onClick={handleGenerateImage}
            disabled={!hasMessages}
            style={{ opacity: hasMessages ? 1 : 0.5 }}
          >
            <IconDownload /> 生成图片
          </button>
          <button
            className="wc-btn wc-btn-sm"
            onClick={handleCopyImage}
            disabled={!hasMessages}
            style={{ opacity: hasMessages ? 1 : 0.5 }}
          >
            <IconCopy /> 复制
          </button>
          <button
            className="wc-btn wc-btn-sm"
            onClick={handleGenerateLongImage}
            disabled={!hasMessages}
            style={{ opacity: hasMessages ? 1 : 0.5 }}
          >
            <IconImage /> 长截图
          </button>
          <button className="wc-btn wc-btn-sm" onClick={handleExportJson} disabled={!hasMessages} style={{ opacity: hasMessages ? 1 : 0.5 }}>
            <IconDownload /> 导出JSON
          </button>
          <button className="wc-btn wc-btn-sm" onClick={() => jsonImportRef.current?.click()}>
            <IconPlus /> 导入JSON
          </button>
          <input
            ref={jsonImportRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={handleImportJson}
          />
        </div>
      </div>
      <div className="wc-main">
        <div className="wc-left">
          <CurrentDataPanel
            users={users}
            messages={messages}
            settings={settings}
            selfId={selfId}
            onApplyMarkdown={applyMarkdownFromPanel}
            onApplyJson={applyJsonFromPanel}
            showToast={showToast}
          />
          <div style={{ marginTop: 16 }}>
            <ImportPanel text={importText} onTextChange={setImportText} onImport={handleImport} />
          </div>
          <div style={{ marginTop: 16 }}>
            <UserAvatarManager
              users={users}
              selfId={selfId}
              defaultAvatarSrc={defaultAvatar}
              onUpdateAvatar={handleUpdateAvatar}
              onRemoveAvatar={handleRemoveAvatar}
              onSetSelf={setSelfId}
              onAddUser={handleAddUser}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <MessageEditor users={users} selfId={selfId} onAddMessage={handleAddMessage} />
          </div>
          {hasMessages && (
            <div style={{ marginTop: 16 }}>
              <MessageList
                messages={messages}
                users={users}
                selfId={selfId}
                onDelete={handleDeleteMessage}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <SettingsPanel settings={settings} onSettingsChange={setSettings} />
          </div>
        </div>
        {hasMessages && (
          <PhonePreview
            users={users}
            messages={messages}
            settings={settings}
            selfId={selfId}
            phoneRef={phoneRef}
            defaultAvatarSrc={defaultAvatar}
            onUpdateMessage={handleUpdateMessage}
          />
        )}
      </div>
      {toast && <div className="wc-toast">{toast}</div>}
    </div>
  );
}
