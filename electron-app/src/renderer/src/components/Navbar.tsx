// maa的navbar通过AccountManager这样一个组件，嵌入到blueprint的navbar这样的方式
// 引入Applayout。

// 但是我们不是modal弹窗类型的交互，所以也只有参考作用了。

// 另：因为要对arco自带的样式做修改，所以虽然用了tailwind，但还是得加个style文件。
// arco的样式在app.tsx里面被引入，这里无需重复引入。

import { Menu } from "@arco-design/web-react";
import { IconDriveFile, IconSafe, IconSettings } from "@arco-design/web-react/icon";
import React, { useState, useEffect, useRef } from 'react';

const { SubMenu } = Menu;

// EverythingBadge 组件
const EverythingBadge: React.FC = () => (
  <span style={{
    backgroundColor: '#FF8000',
    borderRadius: 4,
    padding: '1px 6px',
    fontSize: '0.7em',
    color: '#fff',
    fontWeight: 600,
    marginLeft: 8,
    verticalAlign: 'middle',
  }}>
    everything
  </span>
);

const MenuItem = Menu.Item; // as重命名

import { useNavigate } from 'react-router-dom';

import './test.less';

export const LINKS: { // 自用数组，用于生成导航里的链接。
    key: string
    to?: string // 可选项，route导航。
    title: string // 或者命名为label。
    icon: JSX.Element // 写一个元素，形如</div>。另一种写法是IconName组件类型，但是兼容性不好，所以不了。
    items?: { key: string; label: string; to?: string; needEverything?: boolean }[]; // 可选项，子菜单。to（跳转路由）对象字面量类型检查，自选。
}[] = [
        {
            key: '0',
            title: '游戏文件',
            icon: <IconDriveFile />,
            items: [
                { key: '0_0', label: 'maa 明日方舟库存管理' },
                { key: '0_1', label: '明日方舟 寻访记录管理' }
            ]
        },
        {
            key: '1',
            title: '论坛app',
            icon: <IconDriveFile />,
            items: [
                { key: '1_0', label: 'b站评论' },
                { key: '1_1', label: '知乎用户回答' },
                { key: '1_2', label: 'b站收藏夹' },
            ]
        },
        {
            key: '2',
            title: '聊天app',
            icon: <IconDriveFile />,
            items: [
                { key: '2_0', label: 'discord聊天记录' },
                { key: '2_1', label: 'qq聊天记录' },
                { key: '2_2', label: '微信聊天记录' }
            ]
        },
        {
            key: '3',
            title: '通用文档',
            icon: <IconDriveFile />,
            items: [
                { key: '3_0', label: '任一文件夹的结构树', to: '/common/folder-tree', needEverything: true },
                { key: '3_1', label: 'obsidian 单篇文档分析' },
                { key: '3_2', label: 'obsidian 多文档分析' },
                { key: '3_3', label: '掘金小册 上云action生成' },
                { key: '3_4', label: 'Hiplot 作图meta生成' },
                { key: '3_5', label: 'Apifox postman双向配置改造' },
            ]
        },
        {
            key: '3a',
            title: '通用工具',
            icon: <IconDriveFile />,
            items: [
                { key: '3a_0', label: 'Unicode / 中文 转换', to: '/tools/unicode' },
                { key: '3a_1', label: 'RGB / Hex 颜色码转换', to: '/tools/color-converter' },
                { key: '3a_2', label: '简体 / 繁体 中文转换', to: '/tools/simplified-traditional' },
                { key: '3a_3', label: '正则筛选 / 文件列表过滤', to: '/tools/regex-filter' },
            ]
        },
        {
            key: '4',
            title: '文与图',
            icon: <IconDriveFile />,
            items: [
                { key: '4_0', label: '手写信生成' },
                { key: '4_1', label: '学信网学历截图（有造假水印）' }
            ]
        },
        {
            key: '5',
            to: '/about',
            title: '官网丨文档丨帮助',
            icon: <IconSafe />
        },
        {
            key: '6',
            to: '/playground',
            title: 'playground DIY广场',
            icon: <IconSettings />
        },
        {
            key: '7',
            to: '/setting',
            title: 'Text-maestro设置',
            icon: <IconSettings />
        }
];


export const NavBar = () => {
    // 路由方法。navigateTo后面不要加括号，那是立即执行等号后者的写法。
    const navigateTo = useNavigate(); 

    const handleNavigation = (path: string) => {
        console.log(`Navigating to: ${path}`);
        navigateTo(path);
    };

    // 可拖拽调整宽度
    const DEFAULT_WIDTH = 245;
    const MIN_WIDTH = 180;
    const MAX_WIDTH = 500;

    const [navWidth, setNavWidth] = useState<number>(() => {
        const saved = localStorage.getItem('navWidth');
        return saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parseInt(saved))) : DEFAULT_WIDTH;
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(navWidth);
    const currentWidthRef = useRef(navWidth);

    // 同步宽度到 CSS 变量（供内容区使用）
    useEffect(() => {
        document.documentElement.style.setProperty('--nav-width', `${navWidth}px`);
        currentWidthRef.current = navWidth;
    }, [navWidth]);

    // 拖拽监听
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - dragStartX.current;
            const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStartWidth.current + delta));
            setNavWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            localStorage.setItem('navWidth', currentWidthRef.current.toString());
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // 拖拽时的全局样式
        const prevCursor = document.body.style.cursor;
        const prevSelect = document.body.style.userSelect;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = prevCursor;
            document.body.style.userSelect = prevSelect;
        };
    }, [isDragging]);

    const startDrag = (e: React.MouseEvent) => {
        e.preventDefault();
        dragStartX.current = e.clientX;
        dragStartWidth.current = navWidth;
        setIsDragging(true);
    };

    return (
        <div className="menu-demo-round" style={{ position: 'fixed', top: 0, left: 0, zIndex: 1000, height: '100vh', width: navWidth }}>
        <Menu style={{ height: '100%', width: '100%' }} mode='vertical' hasCollapseButton>
            {LINKS.map((link) => {
                if (link.items) {
                    return (
                        <SubMenu
                            key={link.key}
                            title={
                                <>
                                    {link.icon}
                                    {link.title}
                                </>
                            }
                        >
                            {link.items.map((item) => (
                                <MenuItem key={item.key} onClick={() => item.to && handleNavigation(item.to)}>
                                    {item.label}
                                    {item.needEverything && <EverythingBadge />}
                                </MenuItem>
                            ))}
                        </SubMenu>
                    );
                } else {
                    return (
                        <MenuItem key={link.key} onClick={() => link.to && handleNavigation(link.to)}>
                            {link.icon}
                            {link.title}
                        </MenuItem>
                    );
                }
            })}
        </Menu>
        {/* 拖拽手柄 */}
        <div
            onMouseDown={startDrag}
            style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '5px',
                height: '100%',
                cursor: 'ew-resize',
                background: isDragging ? 'rgba(47, 129, 235, 0.4)' : 'transparent',
                transition: 'background 0.15s',
                zIndex: 1001,
            }}
            onMouseEnter={(e) => { if (!isDragging) (e.currentTarget as HTMLDivElement).style.background = 'rgba(47, 129, 235, 0.15)'; }}
            onMouseLeave={(e) => { if (!isDragging) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
        />
        </div>
    );
}