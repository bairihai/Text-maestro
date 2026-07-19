import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useTheme } from '@renderer/context/ThemeContext';
import defaultAvatar from '@renderer/assets/wechat_default_avatar.jpg';

// 微信聊天记录生成器（v2 重写版）
// 参考: https://github.com/bairihai/wechat-dialog-generator
//
// 核心改进：
//   1. Markdown / JSON 双模式输入（开源项目 Markdown 格式兼容）
//   2. 多消息类型: text / image / redpacket / transfer / voice / time / system
//   3. 用户列表管理: 每个 sender 可设头像、可标记为"我"
//   4. 点击气泡 inline 编辑
//   5. 真实微信视觉: 顶部状态栏(信号/WiFi/电池) + 标题栏(返回箭头/联系人/更多)
//   6. 头像用真实默认头像（用户提供的下载.jpg）
//   7. 时间节点灰色小卡片，仿真实微信 >5min 间隔显示

// ============================================================
// 类型定义
// ============================================================
type MessageType = 'text' | 'image' | 'redpacket' | 'transfer' | 'voice' | 'time' | 'system';

interface ChatMessage {
  sender: string;
  text?: string;
  time?: string;
  type: MessageType;
  image_path?: string;
  amount?: string;
  duration?: number;
}

interface UserConfig {
  name: string;
  avatarPath?: string;   // 自定义头像路径（空=用默认头像）
  isMe?: boolean;        // 是否为"我"（消息靠右）
}

interface WechatTheme {
  background_color: string;
  status_bar_color: string;
  status_bar_text_color: string;
  header_color: string;
  header_text_color: string;
  header_border_color: string;
  my_bubble_color: string;
  other_bubble_color: string;
  my_text_color: string;
  other_text_color: string;
  system_bg_color: string;
  system_text_color: string;
  time_bg_color: string;
  time_text_color: string;
  redpacket_color: string;
  redpacket_text_color: string;
  transfer_color: string;
  transfer_text_color: string;
  voice_color: string;
  voice_text_color: string;
  status_bar_height: number;
  header_height: number;
  bubble_radius: number;
  avatar_radius: number;
  avatar_size: number;
}

const THEME_PRESETS: Record<string, WechatTheme> = {
  ios_classic: {
    background_color: '#EDEDED',
    status_bar_color: '#EDEDED',
    status_bar_text_color: '#000000',
    header_color: '#EDEDED',
    header_text_color: '#111111',
    header_border_color: '#DCDCDC',
    my_bubble_color: '#95EC69',
    other_bubble_color: '#FFFFFF',
    my_text_color: '#000000',
    other_text_color: '#000000',
    system_bg_color: '#DADADA',
    system_text_color: '#999999',
    time_bg_color: '#DADADA',
    time_text_color: '#FFFFFF',
    redpacket_color: '#FA9D3B',
    redpacket_text_color: '#FFFFFF',
    transfer_color: '#FF7D7D',
    transfer_text_color: '#FFFFFF',
    voice_color: '#95EC69',
    voice_text_color: '#000000',
    status_bar_height: 24,
    header_height: 48,
    bubble_radius: 8,
    avatar_radius: 6,
    avatar_size: 38,
  },
  ios_dark: {
    background_color: '#1A1A1A',
    status_bar_color: '#2C2C2E',
    status_bar_text_color: '#FFFFFF',
    header_color: '#2C2C2E',
    header_text_color: '#FFFFFF',
    header_border_color: '#3A3A3C',
    my_bubble_color: '#2D5B3E',
    other_bubble_color: '#3A3A3C',
    my_text_color: '#FFFFFF',
    other_text_color: '#FFFFFF',
    system_bg_color: '#3A3A3C',
    system_text_color: '#BBBBBB',
    time_bg_color: '#3A3A3C',
    time_text_color: '#FFFFFF',
    redpacket_color: '#C77A2E',
    redpacket_text_color: '#FFFFFF',
    transfer_color: '#CC6666',
    transfer_text_color: '#FFFFFF',
    voice_color: '#2D5B3E',
    voice_text_color: '#FFFFFF',
    status_bar_height: 24,
    header_height: 48,
    bubble_radius: 8,
    avatar_radius: 6,
    avatar_size: 38,
  },
  android: {
    background_color: '#F5F5F5',
    status_bar_color: '#E0E0E0',
    status_bar_text_color: '#212121',
    header_color: '#E0E0E0',
    header_text_color: '#212121',
    header_border_color: '#BDBDBD',
    my_bubble_color: '#B2DFDB',
    other_bubble_color: '#FFFFFF',
    my_text_color: '#212121',
    other_text_color: '#212121',
    system_bg_color: '#E0E0E0',
    system_text_color: '#757575',
    time_bg_color: '#E0E0E0',
    time_text_color: '#FFFFFF',
    redpacket_color: '#FB8C00',
    redpacket_text_color: '#FFFFFF',
    transfer_color: '#E57373',
    transfer_text_color: '#FFFFFF',
    voice_color: '#B2DFDB',
    voice_text_color: '#212121',
    status_bar_height: 24,
    header_height: 48,
    bubble_radius: 4,
    avatar_radius: 4,
    avatar_size: 38,
  },
};

// 默认 Markdown 示例
const DEFAULT_MARKDOWN = `**【3月1日 14:32】**
**我**：你好，在忙不？
**张三**：不忙，怎么了？
**我**：想问下明天的会议几点开始？
**张三**：上午十点，会议室三楼。
**我**：[图片]
**张三**：[红包]恭喜发财
**我**：[转账]200:饭钱
**张三**：[语音]5
**我**：收到，谢谢！`;

// ============================================================
// Markdown 解析（与 utils_wechat.py 保持一致）
// ============================================================
const TIME_NODE_PATTERN = /^\*\*【(.+?)】\*\*\s*$/;
const MSG_PATTERN = /^\*\*(.+?)\*\*[：:]\s*(.*)$/;

function parseMarkdownToMessages(md: string): ChatMessage[] {
  if (!md) return [];
  const messages: ChatMessage[] = [];
  for (const line of md.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let m = TIME_NODE_PATTERN.exec(trimmed);
    if (m) {
      messages.push({ sender: '', text: m[1].trim(), type: 'time' });
      continue;
    }

    m = MSG_PATTERN.exec(trimmed);
    if (m) {
      const sender = m[1].trim();
      const content = m[2].trim();
      const msg: ChatMessage = { sender };

      if (content.startsWith('[图片]')) {
        msg.type = 'image';
        const rest = content.slice(4).trim();
        if (rest) msg.image_path = rest;
      } else if (content.startsWith('[红包]')) {
        msg.type = 'redpacket';
        msg.text = content.slice(4).trim() || '恭喜发财，大吉大利';
      } else if (content.startsWith('[转账]')) {
        msg.type = 'transfer';
        const rest = content.slice(4).trim();
        if (rest.includes(':')) {
          const [amt, ...noteParts] = rest.split(':');
          msg.amount = amt.trim();
          msg.text = noteParts.join(':').trim();
        } else {
          msg.amount = rest;
          msg.text = '';
        }
      } else if (content.startsWith('[语音]')) {
        msg.type = 'voice';
        const dur = parseInt(content.slice(4).trim(), 10);
        msg.duration = isNaN(dur) ? 1 : dur;
      } else {
        msg.type = 'text';
        msg.text = content;
      }
      messages.push(msg);
    }
  }
  return messages;
}

function messagesToMarkdown(messages: ChatMessage[]): string {
  return messages.map(m => {
    const t = m.type;
    if (t === 'time') return `**【${m.text || ''}】**`;
    if (t === 'system') return `**【系统】${m.text || ''}**`;
    const sender = m.sender || '';
    if (t === 'text') return `**${sender}**：${m.text || ''}`;
    if (t === 'image') return `**${sender}**：[图片]${m.image_path || ''}`;
    if (t === 'redpacket') return `**${sender}**：[红包]${m.text || ''}`;
    if (t === 'transfer') return `**${sender}**：[转账]${m.amount || ''}${m.text ? ':' + m.text : ''}`;
    if (t === 'voice') return `**${sender}**：[语音]${m.duration || 1}`;
    return `**${sender}**：${m.text || ''}`;
  }).join('\n');
}

// ============================================================
// 时间格式化（仿真实微信）
// ============================================================
function parseTimeStr(timeStr: string): Date | null {
  if (!timeStr) return null;
  const s = timeStr.trim();
  const now = new Date();

  // HH:MM
  let m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (m) {
    const d = new Date(now);
    d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    return d;
  }

  // 昨天 HH:MM
  m = /^昨天\s*(\d{1,2}):(\d{2})$/.exec(s);
  if (m) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    return d;
  }

  // M月D日 HH:MM
  m = /^(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})$/.exec(s);
  if (m) {
    const d = new Date(now);
    d.setMonth(parseInt(m[1], 10) - 1, parseInt(m[2], 10));
    d.setHours(parseInt(m[3], 10), parseInt(m[4], 10), 0, 0);
    return d;
  }

  return null;
}

function formatTimeForDisplay(dt: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000));

  const hour = dt.getHours();
  const minute = dt.getMinutes();
  let period: string;
  let hour12: number;

  if (hour < 6) { period = '凌晨'; hour12 = hour; }
  else if (hour < 12) { period = '上午'; hour12 = hour; }
  else if (hour < 18) { period = '下午'; hour12 = hour === 12 ? 12 : hour - 12; }
  else { period = '晚上'; hour12 = hour === 12 ? 12 : hour - 12; }

  const timeStr = `${period} ${hour12}:${minute.toString().padStart(2, '0')}`;

  if (diffDays === 0) return timeStr;
  if (diffDays === 1) return `昨天 ${timeStr}`;
  if (diffDays < 7) {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${weekdays[dt.getDay()]} ${timeStr}`;
  }
  return `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 ${timeStr}`;
}

function shouldShowTimeNode(prev: Date | null, curr: Date | null): boolean {
  if (!prev || !curr) return true;
  return Math.abs(curr.getTime() - prev.getTime()) / 1000 > 5 * 60;
}

// ============================================================
// 主组件
// ============================================================
function WechatChatPage(): JSX.Element {
  const { colors } = useTheme();

  // === 输入模式 ===
  const [inputMode, setInputMode] = useState<'markdown' | 'json'>('markdown');
  const [markdownText, setMarkdownText] = useState(DEFAULT_MARKDOWN);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // === 消息列表（核心状态）===
  const [messages, setMessages] = useState<ChatMessage[]>(() => parseMarkdownToMessages(DEFAULT_MARKDOWN));

  // === 用户配置（每个 sender 的头像 + isMe 标记）===
  const [userConfigs, setUserConfigs] = useState<Record<string, UserConfig>>({});

  // === 当前编辑的气泡 ===
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editSender, setEditSender] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDuration, setEditDuration] = useState(1);
  const [editImagePath, setEditImagePath] = useState('');

  // === 外观设置 ===
  const [theme, setTheme] = useState<string>('ios_classic');
  const [canvasWidth, setCanvasWidth] = useState(420);
  const [fontSize, setFontSize] = useState(15);
  const [title, setTitle] = useState('张三');
  const [statusBarTime, setStatusBarTime] = useState('14:32');
  const [batteryLevel, setBatteryLevel] = useState(70);
  const [showAvatar, setShowAvatar] = useState(true);
  const [showTime, setShowTime] = useState(true);
  const [overrides, setOverrides] = useState<Partial<WechatTheme>>({});
  const [outputFormat, setOutputFormat] = useState('png');

  // === 输出 ===
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  // 合并主题
  const effectiveTheme: WechatTheme = useMemo(() => {
    return { ...THEME_PRESETS[theme], ...overrides };
  }, [theme, overrides]);

  // 自动从 messages 提取用户列表
  const knownUsers = useMemo(() => {
    const set = new Set<string>();
    messages.forEach(m => { if (m.sender) set.add(m.sender); });
    return Array.from(set);
  }, [messages]);

  // 用户配置的兜底（messages 中出现但未配置的用户）
  const effectiveUserConfigs = useMemo(() => {
    const result: Record<string, UserConfig> = {};
    knownUsers.forEach(name => {
      result[name] = userConfigs[name] || { name, isMe: name === '我' };
    });
    return result;
  }, [knownUsers, userConfigs]);

  // "我"的用户名
  const meName = useMemo(() => {
    const meEntry = Object.values(effectiveUserConfigs).find(u => u.isMe);
    return meEntry?.name || '我';
  }, [effectiveUserConfigs]);

  // ============================================================
  // Markdown ↔ messages 双向同步
  // ============================================================
  const handleMarkdownChange = (newText: string) => {
    setMarkdownText(newText);
    const parsed = parseMarkdownToMessages(newText);
    setMessages(parsed);
  };

  const handleJsonChange = (newText: string) => {
    setJsonText(newText);
    try {
      const parsed = JSON.parse(newText);
      if (!Array.isArray(parsed)) {
        setJsonError('JSON 必须是数组');
        return;
      }
      const normalized: ChatMessage[] = parsed.map((m: any) => ({
        sender: typeof m.sender === 'string' ? m.sender : '',
        text: typeof m.text === 'string' ? m.text : undefined,
        time: typeof m.time === 'string' ? m.time : undefined,
        type: ['text', 'image', 'redpacket', 'transfer', 'voice', 'time', 'system'].includes(m.type) ? m.type : 'text',
        image_path: typeof m.image_path === 'string' ? m.image_path : undefined,
        amount: typeof m.amount === 'string' ? m.amount : undefined,
        duration: typeof m.duration === 'number' ? m.duration : undefined,
      }));
      setMessages(normalized);
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const syncMessagesToMarkdown = useCallback((newMsgs: ChatMessage[]) => {
    setMarkdownText(messagesToMarkdown(newMsgs));
  }, []);

  const switchToInputMode = (mode: 'markdown' | 'json') => {
    if (mode === 'json' && !jsonText) {
      // 首次切到 JSON 模式：把当前 messages 序列化进去
      setJsonText(JSON.stringify(messages, null, 2));
    }
    setInputMode(mode);
  };

  // ============================================================
  // 消息操作（点击气泡编辑、添加、删除、移动）
  // ============================================================
  const handleBubbleClick = (idx: number) => {
    if (editingIndex === idx) {
      setEditingIndex(null);
      return;
    }
    const m = messages[idx];
    setEditingIndex(idx);
    setEditText(m.text || '');
    setEditSender(m.sender);
    setEditTime(m.time || '');
    setEditAmount(m.amount || '');
    setEditDuration(m.duration || 1);
    setEditImagePath(m.image_path || '');
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const newMsgs = [...messages];
    const old = newMsgs[editingIndex];
    const t = old.type;
    newMsgs[editingIndex] = {
      ...old,
      sender: t === 'time' || t === 'system' ? '' : editSender,
      text: (t === 'text' || t === 'redpacket' || t === 'transfer' || t === 'system' || t === 'time') ? editText : old.text,
      time: editTime || undefined,
      amount: t === 'transfer' ? editAmount : old.amount,
      duration: t === 'voice' ? editDuration : old.duration,
      image_path: t === 'image' ? editImagePath : old.image_path,
    };
    setMessages(newMsgs);
    syncMessagesToMarkdown(newMsgs);
    if (inputMode === 'json') setJsonText(JSON.stringify(newMsgs, null, 2));
    setEditingIndex(null);
  };

  const handleCancelEdit = () => setEditingIndex(null);

  const handleAddMessage = (type: MessageType) => {
    let newMsg: ChatMessage;
    if (type === 'system') {
      newMsg = { sender: '', text: '系统消息', type: 'system' };
    } else if (type === 'time') {
      newMsg = { sender: '', text: '15:00', type: 'time' };
    } else if (type === 'image') {
      newMsg = { sender: meName, type: 'image' };
    } else if (type === 'redpacket') {
      newMsg = { sender: meName, text: '恭喜发财', type: 'redpacket' };
    } else if (type === 'transfer') {
      newMsg = { sender: meName, amount: '100', text: '', type: 'transfer' };
    } else if (type === 'voice') {
      newMsg = { sender: meName, duration: 3, type: 'voice' };
    } else {
      newMsg = { sender: meName, text: '新消息', type: 'text' };
    }
    const newMsgs = [...messages, newMsg];
    setMessages(newMsgs);
    syncMessagesToMarkdown(newMsgs);
    if (inputMode === 'json') setJsonText(JSON.stringify(newMsgs, null, 2));
  };

  const handleDeleteMessage = (idx: number) => {
    const newMsgs = messages.filter((_, i) => i !== idx);
    setMessages(newMsgs);
    syncMessagesToMarkdown(newMsgs);
    if (inputMode === 'json') setJsonText(JSON.stringify(newMsgs, null, 2));
    if (editingIndex === idx) setEditingIndex(null);
  };

  const handleMoveMessage = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= messages.length) return;
    const newMsgs = [...messages];
    [newMsgs[idx], newMsgs[newIdx]] = [newMsgs[newIdx], newMsgs[idx]];
    setMessages(newMsgs);
    syncMessagesToMarkdown(newMsgs);
    if (inputMode === 'json') setJsonText(JSON.stringify(newMsgs, null, 2));
  };

  // ============================================================
  // 用户配置操作
  // ============================================================
  const handleSetMe = (name: string) => {
    const newConfigs: Record<string, UserConfig> = {};
    Object.entries(effectiveUserConfigs).forEach(([k, v]) => {
      newConfigs[k] = { ...v, isMe: k === name ? !v.isMe : false };
    });
    setUserConfigs(newConfigs);
  };

  const handleSetUserAvatar = (name: string, avatarPath: string) => {
    setUserConfigs(prev => ({
      ...prev,
      [name]: { ...(prev[name] || { name, isMe: name === '我' }), avatarPath: avatarPath || undefined },
    }));
  };

  // ============================================================
  // 生成图片（调用 Python IPC）
  // ============================================================
  const handleGenerate = async () => {
    if (messages.length === 0) {
      setError('消息列表不能为空');
      return;
    }
    setLoading(true);
    setError(null);
    setImageData(null);
    setElapsedMs(0);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 50);

    try {
      const fn = (window as any).electron?.generateWechat;
      if (typeof fn !== 'function') {
        setError('当前环境不支持微信聊天记录生成（缺少 generateWechat IPC 方法）');
        return;
      }
      const payload = messages.map(m => {
        const out: any = { sender: m.sender, type: m.type };
        if (m.text !== undefined) out.text = m.text;
        if (m.time) out.time = m.time;
        if (m.image_path) out.image_path = m.image_path;
        if (m.amount !== undefined) out.amount = m.amount;
        if (m.duration !== undefined) out.duration = m.duration;
        return out;
      });
      const messagesJson = JSON.stringify(payload);

      // 构造 avatar_map（只有自定义过的才传）
      const avatarMap: Record<string, string> = {};
      Object.entries(effectiveUserConfigs).forEach(([name, cfg]) => {
        if (cfg.avatarPath) avatarMap[name] = cfg.avatarPath;
      });
      const avatarMapJson = Object.keys(avatarMap).length > 0 ? JSON.stringify(avatarMap) : '';
      const overridesJson = Object.keys(overrides).length > 0 ? JSON.stringify(overrides) : '';

      const res = await fn(
        messagesJson,
        theme,
        canvasWidth,
        fontSize,
        '',
        overridesJson,
        showAvatar,
        showTime,
        title,
        statusBarTime,
        batteryLevel,
        avatarMapJson,
        meName,
        outputFormat,
      );
      if (!res || res.success === false) {
        setError(res?.error || '生成失败');
        return;
      }
      if (!res.data) {
        setError('生成失败：未返回图片数据');
        return;
      }
      setImageData(res.data);
      showToast('生成成功');
    } catch (err) {
      setError((err as Error).message || '生成失败');
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
    }
  };

  const handleCopyImage = async () => {
    if (!imageData) return;
    try {
      const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
      const byteChars = atob(base64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `image/${outputFormat}` });
      await navigator.clipboard.write([
        new ClipboardItem({ [`${outputFormat === 'jpeg' ? 'jpeg' : 'png'}`]: blob }),
      ]);
      showToast('图片已复制');
    } catch {
      showToast('复制失败');
    }
  };

  const handleDownload = () => {
    if (!imageData) return;
    const base64 = imageData.startsWith('data:image') ? imageData : `data:image/${outputFormat};base64,${imageData}`;
    const a = document.createElement('a');
    a.href = base64;
    a.download = `wechat_chat_${Date.now()}.${outputFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('已下载');
  };

  const handleOpenInNewWindow = () => {
    if (!imageData) return;
    const base64 = imageData.startsWith('data:image') ? imageData : `data:image/${outputFormat};base64,${imageData}`;
    const raw = base64.replace(/^data:image\/\w+;base64,/, '');
    const byteChars = atob(raw);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: `image/${outputFormat}` });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    showToast('已在新窗口打开');
  };

  const previewSrc = imageData
    ? (imageData.startsWith('data:image') ? imageData : `data:image/${outputFormat};base64,${imageData}`)
    : null;

  // ============================================================
  // 计算渲染项（含自动时间节点插入）
  // ============================================================
  const renderItems = useMemo(() => {
    type Item = { kind: 'msg'; msg: ChatMessage; dt: Date | null } | { kind: 'time'; text: string } | { kind: 'system'; msg: ChatMessage };
    const items: Item[] = [];
    let prevDt: Date | null = null;
    for (const m of messages) {
      if (m.type === 'time') {
        items.push({ kind: 'time', text: m.text || '' });
        continue;
      }
      if (m.type === 'system') {
        items.push({ kind: 'system', msg: m });
        continue;
      }
      const currDt = parseTimeStr(m.time || '');
      if (showTime && shouldShowTimeNode(prevDt, currDt)) {
        const timeText = currDt ? formatTimeForDisplay(currDt) : (prevDt === null ? statusBarTime : '');
        if (timeText) items.push({ kind: 'time', text: timeText });
      }
      items.push({ kind: 'msg', msg: m, dt: currDt });
      if (currDt) prevDt = currDt;
    }
    return items;
  }, [messages, showTime, statusBarTime]);

  // ============================================================
  // 渲染：实时预览（React DOM 模拟微信 UI，与 PIL 输出尽量一致）
  // ============================================================
  const renderPreview = () => {
    const t = effectiveTheme;
    return (
      <div
        style={{
          width: canvasWidth,
          maxWidth: '100%',
          margin: '0 auto',
          background: t.background_color,
          borderRadius: 8,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}
      >
        {/* 顶部状态栏 */}
        <div
          style={{
            background: t.status_bar_color,
            color: t.status_bar_text_color,
            height: t.status_bar_height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span>{statusBarTime}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* 信号 */}
            <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1, height: 12 }}>
              {[3, 5, 7, 9].map((h, i) => (
                <span key={i} style={{ width: 2, height: h, background: t.status_bar_text_color, display: 'inline-block' }} />
              ))}
            </span>
            {/* WiFi（用字符） */}
            <span style={{ fontSize: 12 }}>◉</span>
            {/* 电池 */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <span style={{
                width: 22, height: 10, border: `1px solid ${t.status_bar_text_color}`,
                borderRadius: 2, display: 'inline-block', position: 'relative',
              }}>
                <span style={{
                  position: 'absolute', left: 1, top: 1, bottom: 1,
                  width: `${Math.max(2, (batteryLevel / 100) * 18)}px`,
                  background: t.status_bar_text_color,
                }} />
              </span>
              <span style={{ width: 1.5, height: 4, background: t.status_bar_text_color, display: 'inline-block' }} />
            </span>
          </span>
        </div>

        {/* 标题栏 */}
        <div
          style={{
            background: t.header_color,
            color: t.header_text_color,
            height: t.header_height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            borderBottom: `1px solid ${t.header_border_color}`,
          }}
        >
          <span style={{ fontSize: 22, fontWeight: 300, lineHeight: 1 }}>&lt;</span>
          <span style={{ fontSize: 17, fontWeight: 500 }}>{title}</span>
          <span style={{ fontSize: 18, letterSpacing: 1 }}>⋯</span>
        </div>

        {/* 消息区 */}
        <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {renderItems.map((item, idx) => {
            if (item.kind === 'time') {
              return (
                <div key={`t-${idx}`} style={{ textAlign: 'center', padding: '4px 0' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      background: t.time_bg_color,
                      color: t.time_text_color,
                      borderRadius: 4,
                      fontSize: fontSize - 2,
                    }}
                  >
                    {item.text}
                  </span>
                </div>
              );
            }
            if (item.kind === 'system') {
              return (
                <div key={`s-${idx}`} style={{ textAlign: 'center', padding: '4px 0' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      background: t.system_bg_color,
                      color: t.system_text_color,
                      borderRadius: 4,
                      fontSize: fontSize - 1,
                    }}
                  >
                    {item.msg.text}
                  </span>
                </div>
              );
            }

            // 普通消息
            const m = item.msg;
            const userCfg = effectiveUserConfigs[m.sender] || { name: m.sender };
            const isMe = !!userCfg.isMe || m.sender === '我';
            const bubbleColor = isMe ? t.my_bubble_color : t.other_bubble_color;
            const textColor = isMe ? t.my_text_color : t.other_text_color;
            const avatarSrc = userCfg.avatarPath || defaultAvatar;

            // 渲染气泡内容（根据类型）
            let bubbleContent: React.ReactNode = null;
            if (m.type === 'text') {
              bubbleContent = <span style={{ color: textColor, fontSize, lineHeight: 1.4, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{m.text}</span>;
            } else if (m.type === 'image') {
              bubbleContent = m.image_path ? (
                <img src={m.image_path} alt="图片" style={{ maxWidth: 180, maxHeight: 180, borderRadius: t.bubble_radius, display: 'block' }} />
              ) : (
                <div style={{ width: 180, height: 180, background: '#CCCCCC', borderRadius: t.bubble_radius, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999999', fontSize: 14 }}>
                  图片
                </div>
              );
            } else if (m.type === 'redpacket') {
              bubbleContent = (
                <div style={{ background: t.redpacket_color, color: t.redpacket_text_color, borderRadius: t.bubble_radius, padding: '6px 10px', minWidth: 180 }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>￥ {m.text || '恭喜发财'}</div>
                  <div style={{ fontSize: fontSize - 3, opacity: 0.8 }}>微信红包</div>
                </div>
              );
            } else if (m.type === 'transfer') {
              bubbleContent = (
                <div style={{ background: t.transfer_color, color: t.transfer_text_color, borderRadius: t.bubble_radius, padding: '6px 10px', minWidth: 180, textAlign: 'center' }}>
                  <div style={{ fontSize: fontSize + 4, fontWeight: 600 }}>￥{m.amount || '0'}</div>
                  <div style={{ fontSize: fontSize - 3, opacity: 0.8, marginTop: 2 }}>{m.text || '转账'}</div>
                </div>
              );
            } else if (m.type === 'voice') {
              const dur = m.duration || 1;
              const w = Math.max(60, Math.min(180, 50 + dur * 8));
              bubbleContent = (
                <div style={{ background: isMe ? t.my_bubble_color : t.voice_color, color: textColor, borderRadius: t.bubble_radius, padding: '6px 10px', width: w, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    {[4, 7, 10].map((h, i) => (
                      <span key={i} style={{ width: 2, height: h, background: textColor, display: 'inline-block' }} />
                    ))}
                  </span>
                  <span style={{ fontSize, marginLeft: 'auto' }}>{dur}''</span>
                </div>
              );
            }

            // 编辑态
            const isEditing = editingIndex === messages.indexOf(m);
            const realIdx = messages.indexOf(m);

            return (
              <div
                key={`m-${idx}`}
                style={{
                  display: 'flex',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                {/* 头像 */}
                {showAvatar && (
                  <img
                    src={avatarSrc}
                    alt={m.sender}
                    style={{
                      width: t.avatar_size,
                      height: t.avatar_size,
                      borderRadius: t.avatar_radius,
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '70%', gap: 2 }}>
                  {isEditing ? (
                    <EditBubble
                      type={m.type}
                      editText={editText}
                      editSender={editSender}
                      editTime={editTime}
                      editAmount={editAmount}
                      editDuration={editDuration}
                      editImagePath={editImagePath}
                      setEditText={setEditText}
                      setEditSender={setEditSender}
                      setEditTime={setEditTime}
                      setEditAmount={setEditAmount}
                      setEditDuration={setEditDuration}
                      setEditImagePath={setEditImagePath}
                      onSave={handleSaveEdit}
                      onCancel={handleCancelEdit}
                      colors={colors}
                    />
                  ) : (
                    <div
                      onClick={() => handleBubbleClick(realIdx)}
                      title="点击编辑"
                      style={{
                        cursor: 'pointer',
                        border: '1px dashed transparent',
                        transition: 'border-color 0.15s',
                        padding: 0,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(35, 134, 54, 0.5)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; }}
                    >
                      {/* 文本气泡用 bubbleColor 背景；其他类型气泡内部自带背景 */}
                      {m.type === 'text' ? (
                        <div style={{
                          background: bubbleColor,
                          padding: '8px 10px',
                          borderRadius: t.bubble_radius,
                        }}>
                          {bubbleContent}
                        </div>
                      ) : bubbleContent}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  {!isEditing && (
                    <MessageActions
                      idx={realIdx}
                      total={messages.length}
                      onMove={handleMoveMessage}
                      onDelete={handleDeleteMessage}
                      color={t.system_text_color}
                      align={isMe ? 'right' : 'left'}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================
  // 主渲染
  // ============================================================
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.pageBg,
      color: colors.textPrimary,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--arco-color-border)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 20 }}>💬</span>
        <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>微信聊天记录生成器</h1>
        <span style={{
          backgroundColor: '#FF8000', borderRadius: 5, padding: '2px 8px',
          fontSize: '0.85em', color: '#fff', fontWeight: 600,
        }}>python</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: colors.textSecondary }}>
          参考开源项目 gaopengbin/wechat-dialog-generator
        </span>
      </div>

      <div style={{ padding: '16px 24px 32px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        {/* 主题与外观设置 */}
        <div style={{
          background: colors.cardBg, border: `1px solid ${colors.border}`,
          borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>
            主题与外观
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>风格预设</div>
              <select
                value={theme}
                onChange={(e) => { setTheme(e.target.value); setOverrides({}); }}
                style={{ width: '100%', padding: '5px 8px', fontSize: 14, background: colors.inputBg, color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: 6 }}
              >
                <option value="ios_classic">iOS 经典绿</option>
                <option value="ios_dark">iOS 暗黑模式</option>
                <option value="android">Android 风格</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>画布宽度</div>
              <input
                type="number" min={300} max={800} value={canvasWidth}
                onChange={(e) => setCanvasWidth(parseInt(e.target.value) || 420)}
                style={{ width: '100%', padding: '5px 12px', fontSize: 14, background: colors.inputBg, color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: 6, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>字号</div>
              <input
                type="number" min={10} max={28} value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value) || 15)}
                style={{ width: '100%', padding: '5px 12px', fontSize: 14, background: colors.inputBg, color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: 6, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>输出格式</div>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                style={{ width: '100%', padding: '5px 8px', fontSize: 14, background: colors.inputBg, color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: 6 }}
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WEBP</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>标题栏（联系人名称）</div>
              <input
                type="text" value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '5px 12px', fontSize: 14, background: colors.inputBg, color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: 6, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>状态栏时间</div>
              <input
                type="text" value={statusBarTime}
                onChange={(e) => setStatusBarTime(e.target.value)}
                placeholder="如 14:32"
                style={{ width: '100%', padding: '5px 12px', fontSize: 14, background: colors.inputBg, color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: 6, boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>电量（%）</div>
              <input
                type="number" min={0} max={100} value={batteryLevel}
                onChange={(e) => setBatteryLevel(parseInt(e.target.value) || 70)}
                style={{ width: '100%', padding: '5px 12px', fontSize: 14, background: colors.inputBg, color: colors.textPrimary, border: `1px solid ${colors.border}`, borderRadius: 6, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 18 }}>
              <label style={{ fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={showAvatar} onChange={(e) => setShowAvatar(e.target.checked)} style={{ marginRight: 6 }} />
                头像
              </label>
              <label style={{ fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={showTime} onChange={(e) => setShowTime(e.target.checked)} style={{ marginRight: 6 }} />
                时间节点
              </label>
            </div>
          </div>

          {/* 颜色微调 */}
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: colors.textSecondary }}>
              颜色微调（覆盖预设）
            </summary>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 8 }}>
              {([
                ['my_bubble_color', '我方气泡'],
                ['other_bubble_color', '对方气泡'],
                ['background_color', '背景色'],
                ['header_color', '标题栏背景'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>
                  <input
                    type="color"
                    value={(overrides[key] as string) || (effectiveTheme[key] as string)}
                    onChange={(e) => setOverrides({ ...overrides, [key]: e.target.value })}
                    style={{ width: '100%', height: 30, padding: 0, border: `1px solid ${colors.border}`, borderRadius: 4, cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>
            {Object.keys(overrides).length > 0 && (
              <button
                onClick={() => setOverrides({})}
                style={{ marginTop: 8, padding: '3px 10px', fontSize: 12, cursor: 'pointer', background: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: 6 }}
              >
                重置为预设
              </button>
            )}
          </details>
        </div>

        {/* 双栏：左输入区 + 右实时预览 */}
        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 16, flex: 1 }}>
          {/* 左：输入区 + 用户列表 */}
          <div style={{
            background: colors.cardBg, border: `1px solid ${colors.border}`,
            borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {/* 输入模式切换 */}
            <div style={{ display: 'flex', gap: 6, borderBottom: `1px solid ${colors.border}`, paddingBottom: 8 }}>
              <button
                onClick={() => switchToInputMode('markdown')}
                style={{
                  padding: '4px 12px', fontSize: 13, cursor: 'pointer',
                  background: inputMode === 'markdown' ? '#238636' : 'transparent',
                  color: inputMode === 'markdown' ? '#fff' : colors.textSecondary,
                  border: `1px solid ${inputMode === 'markdown' ? '#238636' : colors.border}`,
                  borderRadius: 4,
                }}
              >Markdown 文本</button>
              <button
                onClick={() => switchToInputMode('json')}
                style={{
                  padding: '4px 12px', fontSize: 13, cursor: 'pointer',
                  background: inputMode === 'json' ? '#238636' : 'transparent',
                  color: inputMode === 'json' ? '#fff' : colors.textSecondary,
                  border: `1px solid ${inputMode === 'json' ? '#238636' : colors.border}`,
                  borderRadius: 4,
                }}
              >JSON 高级</button>
            </div>

            {inputMode === 'markdown' ? (
              <>
                <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.5 }}>
                  格式：<code>**用户名**：内容</code> / <code>**【时间】**</code> / <code>[图片]</code> / <code>[红包]备注</code> / <code>[转账]金额:备注</code> / <code>[语音]秒数</code>
                </div>
                <textarea
                  style={{
                    width: '100%', minHeight: 320, resize: 'vertical',
                    padding: '8px 12px', fontSize: 13, lineHeight: 1.6,
                    background: colors.inputBg, color: colors.textPrimary,
                    border: `1px solid ${colors.border}`, borderRadius: 6,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    boxSizing: 'border-box',
                  }}
                  value={markdownText}
                  onChange={(e) => handleMarkdownChange(e.target.value)}
                  spellCheck={false}
                />
                <div style={{ fontSize: 12, color: colors.textSecondary }}>
                  共 {messages.length} 条消息
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: colors.textSecondary }}>
                  JSON 数组格式（修改后自动同步预览）
                </div>
                <textarea
                  style={{
                    width: '100%', minHeight: 320, resize: 'vertical',
                    padding: '8px 12px', fontSize: 12, lineHeight: 1.5,
                    background: colors.inputBg, color: colors.textPrimary,
                    border: `1px solid ${colors.border}`, borderRadius: 6,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                    boxSizing: 'border-box',
                  }}
                  value={jsonText}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  spellCheck={false}
                />
                {jsonError ? (
                  <div style={{ color: '#f53f3f', fontSize: 12 }}>JSON 错误：{jsonError}</div>
                ) : (
                  <div style={{ fontSize: 12, color: colors.textSecondary }}>
                    共 {messages.length} 条消息
                  </div>
                )}
              </>
            )}

            {/* 添加消息按钮 */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', borderTop: `1px solid ${colors.border}`, paddingTop: 8 }}>
              <span style={{ fontSize: 12, color: colors.textSecondary, marginRight: 4, alignSelf: 'center' }}>添加：</span>
              {(['text', 'image', 'redpacket', 'transfer', 'voice', 'time', 'system'] as MessageType[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleAddMessage(t)}
                  style={{
                    padding: '2px 8px', fontSize: 11, cursor: 'pointer',
                    background: 'transparent', color: colors.textPrimary,
                    border: `1px solid ${colors.border}`, borderRadius: 4,
                  }}
                >
                  + {t}
                </button>
              ))}
            </div>

            {/* 用户列表 */}
            {knownUsers.length > 0 && (
              <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 8 }}>
                <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 6 }}>
                  用户列表（{knownUsers.length}）—— 点击"我"切换消息左右方向
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {knownUsers.map(name => {
                    const cfg = effectiveUserConfigs[name] || { name, isMe: name === '我' };
                    return (
                      <div key={name} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                        fontSize: 12,
                      }}>
                        <img
                          src={cfg.avatarPath || defaultAvatar}
                          alt={name}
                          style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }}
                        />
                        <span style={{ fontWeight: 500, minWidth: 50 }}>{name}</span>
                        <button
                          onClick={() => handleSetMe(name)}
                          style={{
                            padding: '2px 8px', fontSize: 11, cursor: 'pointer',
                            background: cfg.isMe ? '#95EC69' : 'transparent',
                            color: cfg.isMe ? '#000' : colors.textSecondary,
                            border: `1px solid ${cfg.isMe ? '#95EC69' : colors.border}`,
                            borderRadius: 4,
                          }}
                        >
                          {cfg.isMe ? '✓ 我' : '设为我'}
                        </button>
                        <input
                          type="text"
                          placeholder="自定义头像路径（可选）"
                          value={cfg.avatarPath || ''}
                          onChange={(e) => handleSetUserAvatar(name, e.target.value)}
                          style={{
                            flex: 1, padding: '2px 6px', fontSize: 11,
                            background: colors.inputBg, color: colors.textPrimary,
                            border: `1px solid ${colors.border}`, borderRadius: 4,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 右：实时预览 */}
          <div style={{
            background: colors.cardBg, border: `1px solid ${colors.border}`,
            borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              实时预览（点击气泡可编辑）
            </div>
            <div
              style={{
                padding: 16,
                border: '1px dashed var(--arco-color-border-2)',
                borderRadius: 6,
                background: 'var(--arco-color-fill-1)',
                overflow: 'auto',
                minHeight: 400,
                maxHeight: '70vh',
              }}
            >
              {renderPreview()}
            </div>
          </div>
        </div>

        {/* 生成按钮 */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={loading
              ? { background: 'rgba(35, 134, 54, 0.5)', color: '#fff', border: '1px solid rgba(240,246,252,0.1)', borderRadius: 6, padding: '5px 16px', fontSize: 14, fontWeight: 500, cursor: 'not-allowed' }
              : { background: '#238636', color: '#fff', border: '1px solid rgba(240,246,252,0.1)', borderRadius: 6, padding: '5px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }
            }
          >
            {loading ? `生成中... ${(elapsedMs / 1000).toFixed(1)}s` : '生成图片'}
          </button>
          {imageData && (
            <>
              <button onClick={handleCopyImage} style={{ padding: '3px 10px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '1px solid var(--arco-color-border)', borderRadius: 6 }}>复制图片</button>
              <button onClick={handleDownload} style={{ padding: '3px 10px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '1px solid var(--arco-color-border)', borderRadius: 6 }}>下载</button>
              <button onClick={handleOpenInNewWindow} style={{ padding: '3px 10px', fontSize: 12, cursor: 'pointer', background: 'transparent', border: '1px solid var(--arco-color-border)', borderRadius: 6 }}>新窗口打开</button>
            </>
          )}
          {error && <span style={{ color: '#f53f3f', fontSize: 13 }}>{error}</span>}
          {toast && (
            <div style={{
              position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '6px 14px',
              borderRadius: 4, fontSize: 13, zIndex: 9999, pointerEvents: 'none',
            }}>{toast}</div>
          )}
        </div>

        {/* 生成的图片 */}
        {imageData && (
          <div style={{
            background: colors.cardBg, border: `1px solid ${colors.border}`,
            borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              生成结果
            </div>
            <div
              style={{
                padding: 16,
                border: '1px dashed var(--arco-color-border-2)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 200,
                background: 'var(--arco-color-fill-1)',
              }}
            >
              <img src={previewSrc!} alt="微信聊天记录" style={{ maxWidth: '100%', maxHeight: 600 }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 编辑气泡子组件
// ============================================================
function EditBubble({
  type, editText, editSender, editTime, editAmount, editDuration, editImagePath,
  setEditText, setEditSender, setEditTime, setEditAmount, setEditDuration, setEditImagePath,
  onSave, onCancel, colors,
}: {
  type: MessageType;
  editText: string;
  editSender: string;
  editTime: string;
  editAmount: string;
  editDuration: number;
  editImagePath: string;
  setEditText: (v: string) => void;
  setEditSender: (v: string) => void;
  setEditTime: (v: string) => void;
  setEditAmount: (v: string) => void;
  setEditDuration: (v: number) => void;
  setEditImagePath: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const inputStyle: React.CSSProperties = {
    padding: '3px 6px', fontSize: 12,
    border: `1px solid ${colors.border}`, borderRadius: 4,
    background: colors.inputBg, color: colors.textPrimary,
    width: '100%', boxSizing: 'border-box',
  };
  return (
    <div style={{
      background: colors.cardBg,
      border: '2px solid #238636',
      borderRadius: 8,
      padding: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 240,
    }}>
      {type !== 'time' && type !== 'system' && (
        <input type="text" value={editSender} onChange={(e) => setEditSender(e.target.value)} placeholder="发送者" style={inputStyle} />
      )}
      {(type === 'text' || type === 'redpacket' || type === 'transfer' || type === 'system' || type === 'time') && (
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          placeholder={type === 'time' ? '时间字符串，如 14:30 或 3月1日 14:30' : '消息内容'}
          rows={type === 'text' ? 3 : 1}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      )}
      {type === 'transfer' && (
        <input type="text" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="金额，如 200" style={inputStyle} />
      )}
      {type === 'voice' && (
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          时长（秒）：
          <input type="number" min={1} value={editDuration} onChange={(e) => setEditDuration(parseInt(e.target.value) || 1)} style={{ ...inputStyle, width: 80 }} />
        </label>
      )}
      {type === 'image' && (
        <input type="text" value={editImagePath} onChange={(e) => setEditImagePath(e.target.value)} placeholder="图片路径（可选，留空用占位图）" style={inputStyle} />
      )}
      {type !== 'time' && type !== 'system' && (
        <input type="text" value={editTime} onChange={(e) => setEditTime(e.target.value)} placeholder="时间（可选，如 14:30）" style={inputStyle} />
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onSave}
          style={{
            padding: '3px 10px', fontSize: 12, cursor: 'pointer',
            background: '#238636', color: '#fff', border: 'none', borderRadius: 4,
          }}
        >保存</button>
        <button
          onClick={onCancel}
          style={{
            padding: '3px 10px', fontSize: 12, cursor: 'pointer',
            background: 'transparent', color: colors.textSecondary,
            border: `1px solid ${colors.border}`, borderRadius: 4,
          }}
        >取消</button>
      </div>
    </div>
  );
}

// ============================================================
// 消息操作按钮（上移/下移/删除）
// ============================================================
function MessageActions({
  idx, total, onMove, onDelete, color, align = 'left',
}: {
  idx: number;
  total: number;
  onMove: (idx: number, dir: -1 | 1) => void;
  onDelete: (idx: number) => void;
  color: string;
  align?: 'left' | 'right';
}) {
  return (
    <div
      style={{
        display: 'flex', gap: 4, fontSize: 11,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        opacity: 0.6,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        disabled={idx === 0}
        onClick={() => onMove(idx, -1)}
        style={{
          padding: '1px 6px', fontSize: 10, cursor: idx === 0 ? 'not-allowed' : 'pointer',
          background: 'transparent', color, border: `1px solid ${color}`, borderRadius: 3,
          opacity: idx === 0 ? 0.4 : 1,
        }}
      >↑</button>
      <button
        disabled={idx === total - 1}
        onClick={() => onMove(idx, 1)}
        style={{
          padding: '1px 6px', fontSize: 10, cursor: idx === total - 1 ? 'not-allowed' : 'pointer',
          background: 'transparent', color, border: `1px solid ${color}`, borderRadius: 3,
          opacity: idx === total - 1 ? 0.4 : 1,
        }}
      >↓</button>
      <button
        onClick={() => onDelete(idx)}
        style={{
          padding: '1px 6px', fontSize: 10, cursor: 'pointer',
          background: 'transparent', color: '#f53f3f', border: '1px solid #f53f3f', borderRadius: 3,
        }}
      >✕</button>
    </div>
  );
}

export default WechatChatPage;
