// renderer/container/root/index.tsx
import React from 'react';
import './index.less';

import { Tabs, Typography } from "@arco-design/web-react";
import {
  IconDriveFile,
  IconClockCircle,
  IconFolder,
} from "@arco-design/web-react/icon";
const TabPane = Tabs.TabPane;
const style = {
  // textAlign: "center",
  // marginTop: 20,
};

const { Text } = Typography;


// 目前已知的情报：
// 1. 生效：arco的html
// 2. 生效：arco icon （即：引入方式没问题
// 3. 未生效：arco的css （即：
// 4. 生效：直接写进style的css （即：css能生效
// 5. 未生效：网页端（即：不是electron的问题

// 注意：less只是负责逻辑处理，和模块化没有任何关系

function Root() {
  return(
  <Tabs defaultActiveTab="1">
    <TabPane
      key="1"
      title={
        <span>
          <IconDriveFile style={{ marginRight: 6 }} />
          Discord聊天记录
        </span>
      }
    >
      <Typography.Paragraph style={style}>
        将 <Text underline>符合要求</Text> 的discord
        html聊天记录进行整理与合并
      </Typography.Paragraph>
    </TabPane>
    <TabPane
      key="2"
      title={
        <span>
          <IconClockCircle style={{ marginRight: 6 }} />
          Tab 2
        </span>
      }
      disabled
    >
      <Typography.Paragraph style={style}>
        Content of Tab Panel 2
      </Typography.Paragraph>
    </TabPane>
    <TabPane
      key="3"
      title={
        <span>
          <IconFolder style={{ marginRight: 6 }} />
          文件夹结构树
        </span>
      }
    >
      <Typography.Paragraph style={style}>
        指定一个文件夹，遍历其中结构，并生成树形图
      </Typography.Paragraph>
    </TabPane>
  </Tabs>
  );
}

export default Root;