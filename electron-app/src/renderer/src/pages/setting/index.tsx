import React from 'react';
// import './index.less';

function Setting() {
  return (
    <div id="nurp5mzn1d" className="space-y-8 overflow-y-auto h-full">
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">版本信息</h3>
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-muted-foreground">当前版本</p>
                <p className="text-lg font-semibold">v2.3.1</p>
              </div>
              <div>
                <p className="text-muted-foreground">最新版本</p>
                <p className="text-lg font-semibold">v2.4.0</p>
              </div>
            </div>
          </div>
          <div className="space-x-2">
            <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="mr-2 h-4 w-4"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
              查看更新
            </button>
            <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="mr-2 h-4 w-4"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" x2="12" y1="15" y2="3"></line>
              </svg>
              立即升级
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center space-x-2">
          <button
            type="button"
            role="switch"
            aria-checked="false"
            data-state="unchecked"
            value="on"
            className="peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
            id="auto-update"
          >
            <span
              data-state="unchecked"
              className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
            ></span>
          </button>
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="auto-update"
          >
            启动时自动检查更新并提示
          </label>
        </div>
      </div>
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">语言</h3>
          <button
            type="button"
            role="combobox"
            aria-controls="radix-:r17:"
            aria-expanded="false"
            aria-autocomplete="none"
            dir="ltr"
            data-state="closed"
            data-placeholder=""
            className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-full"
          >
            <span style={{ pointerEvents: 'none' }}>选择语言</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="lucide lucide-chevron-down h-4 w-4 opacity-50"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </button>
        </div>
      </div>
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">开机自启</h3>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              role="switch"
              aria-checked="false"
              data-state="unchecked"
              value="on"
              className="peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
              id="auto-start"
            >
              <span
                data-state="unchecked"
                className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
              ></span>
            </button>
            <label
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="auto-start"
            >
              在系统启动时自动启动软件
            </label>
          </div>
        </div>
      </div>
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">服务协议</h3>
          <div className="text-muted-foreground">
            <p>请仔细阅读并同意我们的服务协议,以便继续使用本软件。</p>
            <a className="underline" href="#">
              查看服务协议
            </a>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              role="checkbox"
              aria-checked="false"
              data-state="unchecked"
              value="on"
              className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              id="agree-terms"
            ></button>
            <label
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              htmlFor="agree-terms"
            >
              我已阅读并同意服务协议
            </label>
          </div>
        </div>
      </div>
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">代理设置</h3>
          <div className="grid gap-4">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                role="switch"
                aria-checked="false"
                data-state="unchecked"
                value="on"
                className="peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                id="use-proxy"
              >
                <span
                  data-state="unchecked"
                  className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
                ></span>
              </button>
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="use-proxy"
              >
                启用代理
              </label>
            </div>
            <div className="grid gap-2">
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="proxy-host"
              >
                代理主机
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="proxy-host"
                placeholder="例如: 127.0.0.1"
              />
            </div>
            <div className="grid gap-2">
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                htmlFor="proxy-port"
              >
                代理端口
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="proxy-port"
                placeholder="例如: 8080"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Setting;