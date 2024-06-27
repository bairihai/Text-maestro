// renderer/container/root/index.tsx
import React from 'react';
import './index.less';

import { Tabs, Typography } from "@arco-design/web-react";

const TabPane = Tabs.TabPane;

const { Text } = Typography;


import { Menu } from "@arco-design/web-react";
import {
    IconDriveFile,
    IconFolder,

    IconSafe,

    IconSettings,
    IconFire,
} from "@arco-design/web-react/icon";
const MenuItem = Menu.Item;
const SubMenu = Menu.SubMenu;


import { useHistory } from 'react-router';


const NavBar = () => {
    const history = useHistory(); // 使用 useHistory 钩子 版本问题懒得改了（这都是屎山改不动的）

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
                <MenuItem key="3_2">掘金小册 上云action生成</MenuItem>
            </SubMenu>

            <MenuItem key="5" onClick={() => history.push('/document')}>
                <IconSafe />
                官网丨文档丨帮助
            </MenuItem>

            <MenuItem key="6" onClick={() => history.push('/')}>
                <IconSettings />
                playground DIY广场
            </MenuItem>

            <MenuItem key="7" onClick={() => history.push('/')}>
                <IconSettings />
                Text-maestro设置
            </MenuItem>
        </Menu>
        // </div>
    );
}

export default NavBar;

