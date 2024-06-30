// maa的navbar通过AccountManager这样一个组件，嵌入到blueprint的navbar这样的方式
// 引入Applayout。

// 但是我们不是modal弹窗类型的交互，所以也只有参考作用了。

// 另：因为要对arco自带的样式做修改，所以虽然用了tailwind，但还是得加个style文件。
// arco的样式在app.tsx里面被引入，这里无需重复引入。

import React, { useEffect } from 'react';

import { Tabs, Typography, Menu } from "@arco-design/web-react";
import { IconDriveFile, IconFolder, IconSafe, IconSettings, IconFire } from "@arco-design/web-react/icon";

const { Text } = Typography;
const { TabPane } = Tabs;
const { SubMenu } = Menu;

const MenuItem = Menu.Item; // as重命名

import { useNavigate } from 'react-router-dom';

import './test.less';

export const LINKS: { // 自用数组，用于生成导航里的链接。
    key: string
    to?: string // 可选项，route导航。
    title: string // 或者命名为label。
    icon: JSX.Element // 写一个元素，形如</div>。另一种写法是IconName组件类型，但是兼容性不好，所以不了。
    items?: { key: string; label: string }[]; // 可选项，子菜单。
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
            { key: '1_2', label: 'b站收藏夹' }
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
            { key: '3_0', label: '任一文件夹的结构树' },
            { key: '3_1', label: 'obsidian 单篇文档分析' },
            { key: '3_2', label: 'obsidian 多文档分析' },
            { key: '3_3', label: '掘金小册 上云action生成' },
            { key: '3_4', label: 'Hiplot 作图meta生成' },
            { key: '3_5', label: 'Apifox postman双向配置改造' }
        ]
    },
    {
        key: '5',
        to: '/document',
        title: '官网丨文档丨帮助',
        icon: <IconSafe />
    },
    {
        key: '6',
        to: '/1',
        title: 'playground DIY广场',
        icon: <IconSettings />
    },
    {
        key: '7',
        to: '/1',
        title: 'Text-maestro设置',
        icon: <IconSettings />
    }
];

export const NavBar = () => {
    const navigateTo = useNavigate(); // 路由方法。navigateTo后面不要加括号，那是立即执行等号后者的写法。

    useEffect(() => {
        // 获取所有需要添加样式的元素
        const menuElements = document.querySelectorAll('.menu-demo-round .arco-menu');
        const buttonElements = document.querySelectorAll('.arco-menu-collapse-button');

        console.log('Menu Elements:', menuElements); // 日志输出选中的菜单元素
        console.log('Button Elements:', buttonElements); // 日志输出选中的按钮元素
    

        // 为这些元素添加 Tailwind CSS 类
        menuElements.forEach(element => {
            element.classList.add('h-full', 'shadow'); // 示例：添加高度100%和阴影
            console.log('Updated Menu Element:', element); // 日志输出更新后的元素
        });

        buttonElements.forEach(element => {
            element.classList.add('right-0', 'bottom-2', 'translate-x-1/2'); // 示例：调整位置和变换
            console.log('Updated Button Element:', element); // 日志输出更新后的元素
        });

        // 可以根据需要继续添加其他元素和类
    }, []);

    return (
        // <div className="menu-demo-round" style={{ height: '100%' , width: 200 }}>
        <Menu style={{ height: '100%', width: 245 }} mode='vertical' hasCollapseButton>
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
                                <MenuItem key={item.key}>{item.label}</MenuItem>
                            ))}
                        </SubMenu>
                    );
                } else {
                    return (
                        <MenuItem key={link.key} onClick={() => navigateTo(link.to)}>
                            {link.icon}
                            {link.title}
                        </MenuItem>
                    );
                }
            })}
        </Menu>
    );
}