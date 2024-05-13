// renderer/container/root/index.tsx
import React from 'react';
// import './index.less';

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