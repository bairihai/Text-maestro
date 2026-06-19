// renderer/common/utils/file.ts
// 👇 先打印一下Node版本

const fileAction = {
  logNodeVersion: function() { // 定义一个方法来打印Node版本
    console.log(`Node Version: ${process.versions.node}`);
  }
};

export default fileAction;