import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useTheme } from '@renderer/context/ThemeContext';

// 微信聊天记录生成器
// 文生图功能：JSON 消息序列 → 微信风格聊天截图
// 改进点（相对开源项目 gaopengbin/wechat-dialog-generator）：
//   1. 双向编辑：JSON 编辑器 ↔ 实时预览，修改 JSON 立即同步到预览
//   2. 点击气泡直接编辑：点击预览中的气泡弹出 inline 编辑框，修改文本/发送者/时间
//   3. 图片可下载/复制/新窗口打开
//   4. 多风格预设切换 + 颜色微调
//   5. 添加/删除/移动消息

// ============================================================
// 类型与主题预设（与 utils_wechat.py 中的 THEME_PRESETS 一致）
// ============================================================
type MessageType = 'text' | 'system' | 'time';

interface ChatMessage {
  sender: string;
  text: string;
  time?: string;
  type: MessageType;
}

interface WechatTheme {
  background_color: string;
  header_color: string;
  header_text_color: string;
  my_bubble_color: string;
  other_bubble_color: string;
  my_text_color: string;
  other_text_color: string;
  system_text_color: string;
  time_text_color: string;
  avatar_bg_me: string;
  avatar_bg_other: string;
  avatar_text_color: string;
  header_height: number;
  bubble_radius: number;
}

const THEME_PRESETS: Record<string, WechatTheme> = {
  ios_classic: {
    background_color: '#EDEDED',
    header_color: '#EDEDED',
    header_text_color: '#111111',
    my_bubble_color: '#95EC69',
    other_bubble_color: '#FFFFFF',
    my_text_color: '#000000',
    other_text_color: '#000000',
    system_text_color: '#999999',
    time_text_color: '#999999',
    avatar_bg_me: '#7BB6E8',
    avatar_bg_other: '#FFBE5C',
    avatar_text_color: '#FFFFFF',
    header_height: 64,
    bubble_radius: 8,
  },
  ios_dark: {
    background_color: '#1A1A1A',
    header_color: '#2C2C2E',
    header_text_color: '#FFFFFF',
    my_bubble_color: '#2D5B3E',
    other_bubble_color: '#3A3A3C',
    my_text_color: '#FFFFFF',
    other_text_color: '#FFFFFF',
    system_text_color: '#888888',
    time_text_color: '#888888',
    avatar_bg_me: '#7BB6E8',
    avatar_bg_other: '#FFBE5C',
    avatar_text_color: '#FFFFFF',
    header_height: 64,
    bubble_radius: 8,
  },
  android: {
    background_color: '#F5F5F5',
    header_color: '#E0E0E0',
    header_text_color: '#212121',
    my_bubble_color: '#B2DFDB',
    other_bubble_color: '#FFFFFF',
    my_text_color: '#212121',
    other_text_color: '#212121',
    system_text_color: '#9E9E9E',
    time_text_color: '#9E9E9E',
    avatar_bg_me: '#4DB6AC',
    avatar_bg_other: '#FFA726',
    avatar_text_color: '#FFFFFF',
    header_height: 56,
    bubble_radius: 4,
  },
};

const DEFAULT_MESSAGES: ChatMessage[] = [
  { sender: '我', text: '你好，在吗？', time: '14:30', type: 'text' },
  { sender: '对方', text: '在的，怎么了？', time: '14:30', type: 'text' },
  { sender: '我', text: '想问下明天的会议几点开始？', time: '14:31', type: 'text' },
  { sender: '对方', text: '上午十点，会议室三楼。', time: '14:32', type: 'text' },
  { sender: '我', text: '收到，谢谢！', time: '14:32', type: 'text' },
];

// ============================================================
// 样式
// ============================================================
const getPageStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  minHeight: '100vh',
  background: colors.pageBg,
  color: colors.textPrimary,
  display: 'flex',
  flexDirection: 'column',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
});

const headerStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--arco-color-border)',
  display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap',
};

const titleStyle: React.CSSProperties = {
  fontSize: 16, fontWeight: 600, margin: 0,
};

const contentStyle: React.CSSProperties = {
  padding: '16px 24px 32px',
  display: 'flex', flexDirection: 'column', gap: 16, flex: 1,
};

const getConfigBlockStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  background: colors.cardBg, border: `1px solid ${colors.border}`,
  borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
});

const labelStyle: React.CSSProperties = {
  fontSize: 12, marginBottom: 4,
  fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase',
};

const getInputStyle = (colors: ReturnType<typeof useTheme>['colors']): React.CSSProperties => ({
  width: '100%', padding: '5px 12px', fontSize: 14, lineHeight: '20px',
  background: colors.inputBg, color: colors.textPrimary,
  border: `1px solid ${colors.border}`, borderRadius: 6, outline: 'none',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box',
});

const primaryBtnStyle: React.CSSProperties = {
  background: '#238636', color: '#fff',
  border: '1px solid rgba(240,246,252,0.1)', borderRadius: 6,
  padding: '5px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
  lineHeight: '20px', transition: 'background 0.15s',
};

const disabledBtnStyle: React.CSSProperties = { background: 'rgba(35, 134, 54, 0.5)', cursor: 'not-allowed' };

const smallBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--arco-color-border)', borderRadius: 6, padding: '3px 10px',
  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
};

const pythonBadgeStyle: React.CSSProperties = {
  backgroundColor: '#FF8000', borderRadius: 5, padding: '2px 8px',
  fontSize: '0.85em', color: '#fff', fontWeight: 600,
};

// ============================================================
// 主组件
// ============================================================
function WechatChatPage(): JSX.Element {
  const { colors } = useTheme();

  // 消息列表（核心状态）
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  // JSON 编辑器文本（与 messages 双向绑定）
  const [jsonText, setJsonText] = useState<string>(() => JSON.stringify(DEFAULT_MESSAGES, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  // 当前编辑的气泡索引（点击气泡进入编辑态）
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // 编辑态的临时文本
  const [editText, setEditText] = useState('');
  const [editSender, setEditSender] = useState('');
  const [editTime, setEditTime] = useState('');

  // 风格与定制
  const [theme, setTheme] = useState<string>('ios_classic');
  const [canvasWidth, setCanvasWidth] = useState(420);
  const [fontSize, setFontSize] = useState(16);
  const [title, setTitle] = useState('微信');
  const [showAvatar, setShowAvatar] = useState(true);
  const [showTime, setShowTime] = useState(true);
  const [overrides, setOverrides] = useState<Partial<WechatTheme>>({});
  const [outputFormat, setOutputFormat] = useState('png');

  // 输出
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  // 合并主题 + overrides
  const effectiveTheme: WechatTheme = useMemo(() => {
    return { ...THEME_PRESETS[theme], ...overrides };
  }, [theme, overrides]);

  // ============================================================
  // JSON ↔ messages 双向同步
  // ============================================================

  // 用户在 textarea 中编辑 JSON 时：尝试解析，成功则更新 messages，失败显示错误
  const handleJsonChange = (newText: string) => {
    setJsonText(newText);
    try {
      const parsed = JSON.parse(newText);
      if (!Array.isArray(parsed)) {
        setJsonError('JSON 必须是数组');
        return;
      }
      // 简单校验并规范化
      const normalized: ChatMessage[] = parsed.map((m: any) => ({
        sender: typeof m.sender === 'string' ? m.sender : '',
        text: typeof m.text === 'string' ? m.text : '',
        time: typeof m.time === 'string' ? m.time : undefined,
        type: ['text', 'system', 'time'].includes(m.type) ? m.type : 'text',
      }));
      setMessages(normalized);
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  // messages 变化时（通过点击气泡编辑或按钮添加/删除）→ 同步回 JSON 文本
  const syncMessagesToJson = useCallback((newMessages: ChatMessage[]) => {
    setJsonText(JSON.stringify(newMessages, null, 2));
    setJsonError(null);
  }, []);

  // ============================================================
  // 消息操作（点击气泡编辑、添加、删除、上下移动）
  // ============================================================

  const handleBubbleClick = (idx: number) => {
    if (editingIndex === idx) {
      // 再次点击同一气泡 = 取消编辑
      setEditingIndex(null);
      return;
    }
    setEditingIndex(idx);
    setEditText(messages[idx].text);
    setEditSender(messages[idx].sender);
    setEditTime(messages[idx].time || '');
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    const newMsgs = [...messages];
    newMsgs[editingIndex] = {
      ...newMsgs[editingIndex],
      text: editText,
      sender: editSender,
      time: editTime || undefined,
    };
    setMessages(newMsgs);
    syncMessagesToJson(newMsgs);
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  const handleAddMessage = (type: MessageType = 'text') => {
    const newMsg: ChatMessage = type === 'system'
      ? { sender: '', text: '系统消息', type: 'system' }
      : type === 'time'
      ? { sender: '', text: '15:00', type: 'time' }
      : { sender: '我', text: '新消息', time: '', type: 'text' };
    const newMsgs = [...messages, newMsg];
    setMessages(newMsgs);
    syncMessagesToJson(newMsgs);
  };

  const handleDeleteMessage = (idx: number) => {
    const newMsgs = messages.filter((_, i) => i !== idx);
    setMessages(newMsgs);
    syncMessagesToJson(newMsgs);
    if (editingIndex === idx) setEditingIndex(null);
  };

  const handleMoveMessage = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= messages.length) return;
    const newMsgs = [...messages];
    [newMsgs[idx], newMsgs[newIdx]] = [newMsgs[newIdx], newMsgs[idx]];
    setMessages(newMsgs);
    syncMessagesToJson(newMsgs);
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
      // 构造发送给后端的消息数组（与 utils_wechat.py 期望一致）
      const payload = messages.map(m => ({
        sender: m.sender,
        text: m.text,
        time: m.time || '',
        type: m.type,
      }));
      const messagesJson = JSON.stringify(payload);
      const overridesJson = Object.keys(overrides).length > 0 ? JSON.stringify(overrides) : '';

      const res = await fn(
        messagesJson,
        theme,
        canvasWidth,
        fontSize,
        '',                 // fontPath（空=自动找系统字体）
        overridesJson,
        showAvatar,
        showTime,
        title,
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
  // 渲染实时预览（React 模拟微信 UI，与 PIL 输出尽量一致）
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
        {/* 顶部标题栏 */}
        <div
          style={{
            background: t.header_color,
            color: t.header_text_color,
            height: t.header_height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: fontSize + 4,
            fontWeight: 500,
            borderBottom: `1px solid ${t.background_color === '#EDEDED' ? '#DCDCDC' : 'rgba(255,255,255,0.05)'}`,
          }}
        >
          {title}
        </div>

        {/* 消息列表 */}
        <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, idx) => {
            // 系统消息
            if (msg.type === 'system') {
              return (
                <div key={idx} style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      background: 'rgba(0,0,0,0.08)',
                      color: t.system_text_color,
                      borderRadius: 4,
                      fontSize: fontSize - 2,
                    }}
                  >
                    {msg.text}
                  </span>
                  <MessageActions
                    idx={idx}
                    total={messages.length}
                    onMove={handleMoveMessage}
                    onDelete={handleDeleteMessage}
                    color={t.system_text_color}
                  />
                </div>
              );
            }
            // 时间分隔符
            if (msg.type === 'time') {
              return (
                <div key={idx} style={{ textAlign: 'center' }}>
                  <span style={{ color: t.time_text_color, fontSize: fontSize - 2 }}>
                    {msg.text || msg.time}
                  </span>
                  <MessageActions
                    idx={idx}
                    total={messages.length}
                    onMove={handleMoveMessage}
                    onDelete={handleDeleteMessage}
                    color={t.time_text_color}
                  />
                </div>
              );
            }
            // 普通文本消息
            const isMe = msg.sender === '我' || msg.sender.toLowerCase() === 'me';
            const bubbleColor = isMe ? t.my_bubble_color : t.other_bubble_color;
            const textColor = isMe ? t.my_text_color : t.other_text_color;
            const avatarColor = isMe ? t.avatar_bg_me : t.avatar_bg_other;
            const avatarLetter = (msg.sender.slice(0, 1) || '?').toUpperCase();

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                {/* 头像 */}
                {showAvatar && (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      minWidth: 36,
                      borderRadius: 4,
                      background: avatarColor,
                      color: t.avatar_text_color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 500,
                    }}
                  >
                    {avatarLetter}
                  </div>
                )}

                {/* 气泡 + 操作 */}
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '70%', gap: 4 }}>
                  {/* 时间（如果有且开启） */}
                  {showTime && msg.time && (
                    <div style={{
                      fontSize: fontSize - 4,
                      color: t.time_text_color,
                      textAlign: isMe ? 'right' : 'left',
                    }}>
                      {msg.time}
                    </div>
                  )}

                  {/* 气泡 / 编辑框 */}
                  {editingIndex === idx ? (
                    <div
                      style={{
                        background: colors.cardBg,
                        border: `2px solid #238636`,
                        borderRadius: t.bubble_radius,
                        padding: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <input
                        type="text"
                        value={editSender}
                        onChange={(e) => setEditSender(e.target.value)}
                        placeholder="发送者（'我' = 右侧气泡）"
                        style={{
                          padding: '3px 6px', fontSize: 12,
                          border: `1px solid ${colors.border}`, borderRadius: 4,
                          background: colors.inputBg, color: colors.textPrimary,
                        }}
                      />
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        placeholder="消息内容"
                        rows={2}
                        style={{
                          padding: '5px 8px', fontSize,
                          border: `1px solid ${colors.border}`, borderRadius: 4,
                          background: colors.inputBg, color: colors.textPrimary,
                          resize: 'vertical', minHeight: 40,
                          fontFamily: 'inherit',
                        }}
                      />
                      <input
                        type="text"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        placeholder="时间（可选，如 14:30）"
                        style={{
                          padding: '3px 6px', fontSize: 12,
                          border: `1px solid ${colors.border}`, borderRadius: 4,
                          background: colors.inputBg, color: colors.textPrimary,
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            padding: '3px 10px', fontSize: 12, cursor: 'pointer',
                            background: '#238636', color: '#fff', border: 'none', borderRadius: 4,
                          }}
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            padding: '3px 10px', fontSize: 12, cursor: 'pointer',
                            background: 'transparent', color: colors.textSecondary,
                            border: `1px solid ${colors.border}`, borderRadius: 4,
                          }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleBubbleClick(idx)}
                      title="点击编辑"
                      style={{
                        background: bubbleColor,
                        color: textColor,
                        padding: '8px 10px',
                        borderRadius: t.bubble_radius,
                        fontSize,
                        lineHeight: 1.4,
                        cursor: 'pointer',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        border: '1px dashed transparent',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(35, 134, 54, 0.5)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; }}
                    >
                      {msg.text}
                    </div>
                  )}

                  {/* 上移/下移/删除按钮 */}
                  {editingIndex !== idx && (
                    <MessageActions
                      idx={idx}
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

  return (
    <div style={getPageStyle(colors)}>
      <div style={headerStyle}>
        <span style={{ fontSize: 20 }}>💬</span>
        <h1 style={titleStyle}>微信聊天记录生成器</h1>
        <span style={pythonBadgeStyle}>python</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: colors.textSecondary }}>
          JSON 消息序列 → 微信风格聊天截图（点击气泡可编辑）
        </span>
      </div>

      <div style={contentStyle}>
        {/* 主题与定制 */}
        <div style={getConfigBlockStyle(colors)}>
          <div style={{ ...labelStyle, marginBottom: 0 }}>主题与定制</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div>
              <div style={labelStyle}>风格预设</div>
              <select
                value={theme}
                onChange={(e) => { setTheme(e.target.value); setOverrides({}); }}
                style={{ ...getInputStyle(colors), padding: '5px 8px' }}
              >
                <option value="ios_classic">iOS 经典绿</option>
                <option value="ios_dark">iOS 暗黑模式</option>
                <option value="android">Android 风格</option>
              </select>
            </div>
            <div>
              <div style={labelStyle}>画布宽度</div>
              <input
                type="number" min={300} max={800} value={canvasWidth}
                onChange={(e) => setCanvasWidth(parseInt(e.target.value) || 420)}
                style={getInputStyle(colors)}
              />
            </div>
            <div>
              <div style={labelStyle}>字号</div>
              <input
                type="number" min={10} max={28} value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value) || 16)}
                style={getInputStyle(colors)}
              />
            </div>
            <div>
              <div style={labelStyle}>输出格式</div>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                style={{ ...getInputStyle(colors), padding: '5px 8px' }}
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WEBP</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <div style={labelStyle}>标题文字</div>
              <input
                type="text" value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={getInputStyle(colors)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
              <label style={{ fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={showAvatar}
                  onChange={(e) => setShowAvatar(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                显示头像
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
              <label style={{ fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={showTime}
                  onChange={(e) => setShowTime(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                显示时间
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
                  <div style={labelStyle}>{label}</div>
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
                style={{ ...smallBtnStyle, marginTop: 8 }}
              >
                重置为预设
              </button>
            )}
          </details>
        </div>

        {/* 双栏：左 JSON 编辑器 + 右 实时预览 */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, flex: 1 }}>
          {/* 左：JSON 编辑器 */}
          <div style={getConfigBlockStyle(colors)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...labelStyle, marginBottom: 0 }}>JSON 源（编辑后自动同步到预览）</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleAddMessage('text')} style={smallBtnStyle}>+ 文本</button>
                <button onClick={() => handleAddMessage('system')} style={smallBtnStyle}>+ 系统</button>
                <button onClick={() => handleAddMessage('time')} style={smallBtnStyle}>+ 时间</button>
              </div>
            </div>
            <textarea
              style={{
                ...getInputStyle(colors),
                minHeight: 360,
                resize: 'vertical',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: 12,
                lineHeight: 1.5,
              }}
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              spellCheck={false}
            />
            {jsonError ? (
              <div style={{ color: '#f53f3f', fontSize: 12 }}>JSON 错误：{jsonError}</div>
            ) : (
              <div style={{ color: colors.textSecondary, fontSize: 12 }}>
                共 {messages.length} 条消息
              </div>
            )}
          </div>

          {/* 右：实时预览 */}
          <div style={getConfigBlockStyle(colors)}>
            <div style={{ ...labelStyle, marginBottom: 0 }}>
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
            style={loading ? { ...primaryBtnStyle, ...disabledBtnStyle } : primaryBtnStyle}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? `生成中... ${(elapsedMs / 1000).toFixed(1)}s` : '生成图片'}
          </button>
          {imageData && (
            <>
              <button style={smallBtnStyle} onClick={handleCopyImage}>复制图片</button>
              <button style={smallBtnStyle} onClick={handleDownload}>下载</button>
              <button style={smallBtnStyle} onClick={handleOpenInNewWindow}>新窗口打开</button>
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
          <div style={getConfigBlockStyle(colors)}>
            <div style={labelStyle}>生成结果</div>
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
              <img
                src={previewSrc!}
                alt="微信聊天记录"
                style={{ maxWidth: '100%', maxHeight: 600 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 消息操作按钮（上移/下移/删除）
// ============================================================
function MessageActions({
  idx,
  total,
  onMove,
  onDelete,
  color,
  align = 'left',
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
        display: 'flex',
        gap: 4,
        fontSize: 11,
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
      >
        ↑
      </button>
      <button
        disabled={idx === total - 1}
        onClick={() => onMove(idx, 1)}
        style={{
          padding: '1px 6px', fontSize: 10, cursor: idx === total - 1 ? 'not-allowed' : 'pointer',
          background: 'transparent', color, border: `1px solid ${color}`, borderRadius: 3,
          opacity: idx === total - 1 ? 0.4 : 1,
        }}
      >
        ↓
      </button>
      <button
        onClick={() => onDelete(idx)}
        style={{
          padding: '1px 6px', fontSize: 10, cursor: 'pointer',
          background: 'transparent', color: '#f53f3f', border: '1px solid #f53f3f', borderRadius: 3,
        }}
      >
        ✕
      </button>
    </div>
  );
}

export default WechatChatPage;
