// maa的navbar通过AccountManager这样一个组件，嵌入到blueprint的navbar这样的方式
// 引入Applayout。

// 但是我们不是modal弹窗类型的交互，所以也只有参考作用了。
// 比如，学习一下菜单项拆分到ts数组的办法。

import React from 'react';
import './index.less';

import { Tabs, Typography, Menu } from "@arco-design/web-react";
import { IconDriveFile, IconFolder, IconSafe, IconSettings, IconFire } from "@arco-design/web-react/icon";

const Text = Typography.Text;
const { TabPane } = Tabs;
const { MenuItem, SubMenu } = Menu;

import { useNavigate } from 'react-router-dom';

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

    return (
        // <div className="menu-demo-round" style={{ height: '100%' , width: 200 }}>
        <Menu style={{ height: '100%', width: 245 }} mode='vertical' hasCollapseButton>
            <SubMenu
                key="0"
                title={
                    <>
                        <IconDriveFile />
                        游戏文件
                    </>
                }
            >
                <MenuItem key="0_0">maa 明日方舟库存管理</MenuItem>
                <MenuItem key="0_1">明日方舟 寻访记录管理</MenuItem>
            </SubMenu>

            <SubMenu
                key="1"
                title={
                    <>
                        <IconDriveFile />
                        论坛app
                    </>
                }
            >
                <MenuItem key="1_0">b站评论</MenuItem>
                <MenuItem key="1_1">知乎用户回答</MenuItem>
                <MenuItem key="1_2">b站收藏夹</MenuItem>
            </SubMenu>

            <SubMenu
                key="2"
                title={
                    <>
                        <IconDriveFile />
                        聊天app
                    </>
                }
            >
                <MenuItem key="2_0">discord聊天记录</MenuItem>
                <MenuItem key="2_1">qq聊天记录</MenuItem>
                <MenuItem key="2_2">微信聊天记录</MenuItem>
            </SubMenu>

            <SubMenu
                key="3"
                title={
                    <>
                        <IconDriveFile />
                        通用文档
                    </>
                }
            >
                <MenuItem key="3_0">任一文件夹的结构树</MenuItem>
                <MenuItem key="3_1">obsidian 单篇文档分析</MenuItem>
                <MenuItem key="3_2">obsidian 多文档分析</MenuItem>
                <MenuItem key="3_3">掘金小册 上云action生成</MenuItem>
                <MenuItem key="3_4">Hiplot 作图meta生成</MenuItem>
                <MenuItem key="3_5">Apifox postman双向配置改造</MenuItem>
            </SubMenu>

            <MenuItem key="5" onClick={() => history.push('/document')}>
                <IconSafe />
                官网丨文档丨帮助
            </MenuItem>

            <MenuItem key="6" onClick={() => history.push('/1')}>
                <IconSettings />
                playground DIY广场
            </MenuItem>

            <MenuItem key="7" onClick={() => history.push('/1')}>
                <IconSettings />
                Text-maestro设置
            </MenuItem>
        </Menu>
        // </div>
    );
}


