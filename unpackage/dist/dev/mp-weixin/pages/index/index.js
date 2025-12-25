"use strict";
const common_vendor = require("../../common/vendor.js");
let mqtt;
try {
  mqtt = require("../../static/mqtt.js");
} catch (e) {
  common_vendor.index.__f__("error", "at pages/index/index.vue:93", "加载mqtt.js失败:", e);
}
const _sfc_main = {
  data() {
    return {
      // 当前运行环境：'mp'表示小程序，'browser'表示浏览器
      environment: "",
      // 设备ID，用于生成客户端ID
      deviceId: "device001",
      isOnline: false,
      temperature: 25,
      humidity: 60,
      waterLevel: 10,
      showConnectionStatus: false,
      connectionMessage: "",
      mqttClient: null,
      mqttOptions: {
        host: "fnos.insane.vip",
        // MQTT服务器地址，可根据实际情况修改
        port: 8083,
        // WebSocket端口
        path: "/mqtt",
        clientId: "uniapp_" + Math.random().toString(16).substr(2, 8),
        username: "qq1739",
        // 用户名，如果需要
        password: "123456"
        // 密码，如果需要
      },
      // 开关状态
      switches: [false, false, false, false],
      // sw1, sw2, sw3, sw4
      // 定时器
      statusTimer: null,
      // 连续无回复计数
      noReplyCount: 0,
      // 最大无回复次数
      maxNoReplyCount: 10
    };
  },
  onLoad() {
    this.initMQTT();
  },
  onUnload() {
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
    }
    if (this.mqttClient) {
      this.mqttClient.end();
    }
  },
  methods: {
    // 初始化MQTT连接
    initMQTT() {
      this.initMQTTForMP();
    },
    // 小程序环境的MQTT连接
    // 微信小程序环境的MQTT连接
    initMQTTForMP() {
      try {
        common_vendor.index.__f__("log", "at pages/index/index.vue:168", "小程序环境尝试连接MQTT服务器");
        if (typeof mqtt === "undefined") {
          common_vendor.index.__f__("error", "at pages/index/index.vue:172", "mqtt对象未定义，尝试加载mqtt.min.js");
          this.showConnectionStatus = true;
          this.connectionMessage = "MQTT库未加载，请重试";
          return;
        }
        const clientId = "wx_" + this.deviceId + "_" + (/* @__PURE__ */ new Date()).getTime();
        common_vendor.index.__f__("log", "at pages/index/index.vue:180", "使用客户端ID:", clientId);
        const wsUrl = `wx://${this.mqttOptions.host}:${this.mqttOptions.port}/mqtt`;
        common_vendor.index.__f__("log", "at pages/index/index.vue:184", "连接URL:", wsUrl);
        this.mqttClient = mqtt.connect(wsUrl, {
          clientId,
          username: this.mqttOptions.username,
          password: this.mqttOptions.password,
          keepalive: 60,
          reconnectPeriod: 1e3,
          connectTimeout: 30 * 1e3,
          protocolVersion: 4
          // MQTT 3.1.1
        });
        this.mqttClient.on("connect", () => {
          common_vendor.index.__f__("log", "at pages/index/index.vue:199", "小程序MQTT连接成功");
          this.isOnline = true;
          this.showConnectionStatus = true;
          this.connectionMessage = "MQTT服务器连接成功";
          this.mqttClient.subscribe("mqttpub", {
            qos: 1
          }, (err) => {
            if (!err) {
              common_vendor.index.__f__("log", "at pages/index/index.vue:209", "已订阅主题: mqttpub");
            } else {
              common_vendor.index.__f__("error", "at pages/index/index.vue:211", "订阅主题失败:", err);
            }
          });
          this.sendInitCommand();
          this.statusTimer = setInterval(() => {
            this.sendInitCommand();
          }, 3e3);
          setTimeout(() => {
            this.showConnectionStatus = false;
          }, 3e3);
        });
        this.mqttClient.on("message", (topic, message) => {
          common_vendor.index.__f__("log", "at pages/index/index.vue:231", "收到MQTT消息:", topic, message.toString());
          this.handleMQTTMessage(message.toString());
        });
        this.mqttClient.on("error", (err) => {
          common_vendor.index.__f__("error", "at pages/index/index.vue:237", "MQTT连接错误:", err);
          this.isOnline = false;
          this.showConnectionStatus = true;
          this.connectionMessage = "MQTT连接失败，请检查网络";
        });
        this.mqttClient.on("close", () => {
          common_vendor.index.__f__("log", "at pages/index/index.vue:245", "MQTT连接关闭");
          this.isOnline = false;
        });
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:250", "初始化小程序MQTT失败:", error);
        this.showConnectionStatus = true;
        this.connectionMessage = "MQTT初始化失败";
      }
    },
    // 浏览器环境的MQTT连接
    // 字符串转字节数组
    stringToBytes(str) {
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 128) {
          bytes.push(code);
        } else if (code < 2048) {
          bytes.push(192 | code >> 6);
          bytes.push(128 | code & 63);
        } else {
          bytes.push(224 | code >> 12);
          bytes.push(128 | code >> 6 & 63);
          bytes.push(128 | code & 63);
        }
      }
      return bytes;
    },
    // 订阅主题（小程序环境）
    subscribeToTopic(topic) {
      if (this.environment !== "mp")
        return;
      const subscribePacket = this.buildMQTTSubscribePacket(topic);
      common_vendor.index.sendSocketMessage({
        data: subscribePacket
      });
      common_vendor.index.__f__("log", "at pages/index/index.vue:376", `已订阅主题: ${topic}`);
    },
    // 构建MQTT SUBSCRIBE包
    buildMQTTSubscribePacket(topic) {
      const packet = [];
      packet.push(130);
      packet.push(0);
      packet.push(1);
      const topicBytes = this.stringToBytes(topic);
      packet.push(topicBytes.length >> 8);
      packet.push(topicBytes.length & 255);
      for (let i = 0; i < topicBytes.length; i++) {
        packet.push(topicBytes[i]);
      }
      packet.push(1);
      const remainingLength = packet.length - 1;
      const finalPacket = [130];
      let len = remainingLength;
      do {
        let byte = len & 127;
        len >>= 7;
        if (len > 0)
          byte |= 128;
        finalPacket.push(byte);
      } while (len > 0);
      for (let i = 1; i < packet.length; i++) {
        finalPacket.push(packet[i]);
      }
      return new Uint8Array(finalPacket);
    },
    // 发送初始化命令 {cmd:6}
    sendInitCommand() {
      const command = {
        "cmd": 6
      };
      if (this.mqttClient && this.mqttClient.connected) {
        this.mqttClient.publish("mqttsub", JSON.stringify(command), {
          qos: 1
        }, (err) => {
          if (err) {
            common_vendor.index.__f__("error", "at pages/index/index.vue:438", "发送初始化命令失败:", err);
          } else {
            common_vendor.index.__f__("log", "at pages/index/index.vue:440", "发送初始化命令:", JSON.stringify(command));
          }
        });
        this.noReplyCount++;
        if (this.noReplyCount >= this.maxNoReplyCount && this.isOnline) {
          this.isOnline = false;
          common_vendor.index.__f__("log", "at pages/index/index.vue:450", `设备已离线，连续${this.noReplyCount}次无回复`);
        }
      } else {
        common_vendor.index.__f__("warn", "at pages/index/index.vue:453", "MQTT客户端未连接，无法发送命令");
      }
    },
    // 处理MQTT消息
    handleMQTTMessage(message) {
      try {
        const data = JSON.parse(message);
        common_vendor.index.__f__("log", "at pages/index/index.vue:463", "收到MQTT消息:", data);
        if (data.cmd === 6 && data.data) {
          this.noReplyCount = 0;
          if (!this.isOnline) {
            this.isOnline = true;
            common_vendor.index.__f__("log", "at pages/index/index.vue:473", "设备已恢复在线");
          }
          if (data.data.temp !== void 0) {
            this.temperature = data.data.temp;
          }
          if (data.data.humidity !== void 0) {
            this.humidity = data.data.humidity;
          }
          if (data.data.level !== void 0) {
            this.waterLevel = data.data.level;
          }
          if (data.data.sw && Array.isArray(data.data.sw) && data.data.sw.length >= 4) {
            this.switches = data.data.sw.map((state) => state === 1);
          }
        }
        if (data.status) {
          common_vendor.index.__f__("log", "at pages/index/index.vue:496", "设备状态:", data.status);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/index/index.vue:500", "解析MQTT消息失败:", error);
      }
    },
    // 发送开关控制命令
    sendCommand(switchIndex) {
      this.switches[switchIndex] = !this.switches[switchIndex];
      const command = {
        "cmd": switchIndex + 2,
        // cmd2对应开关1，cmd3对应开关2，以此类推
        "data": this.switches[switchIndex] ? 1 : 0
        // 1表示开启，0表示关闭
      };
      if (this.mqttClient && this.mqttClient.connected) {
        this.mqttClient.publish("mqttsub", JSON.stringify(command), {
          qos: 1
        }, (err) => {
          if (err) {
            common_vendor.index.__f__("error", "at pages/index/index.vue:521", "发送开关命令失败:", err);
            common_vendor.index.showToast({
              title: "命令发送失败",
              icon: "error"
            });
          } else {
            common_vendor.index.__f__("log", "at pages/index/index.vue:527", "发送开关命令:", JSON.stringify(command));
            common_vendor.index.showToast({
              title: `开关${switchIndex + 1}已${this.switches[switchIndex] ? "开启" : "关闭"}`,
              icon: "success"
            });
          }
        });
      } else {
        common_vendor.index.__f__("warn", "at pages/index/index.vue:536", "MQTT客户端未连接，无法发送命令");
        common_vendor.index.showToast({
          title: "设备未连接",
          icon: "error"
        });
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.isOnline ? "在线" : "离线"),
    b: $data.isOnline ? 1 : "",
    c: !$data.isOnline ? 1 : "",
    d: common_vendor.t($data.temperature),
    e: common_vendor.t($data.humidity),
    f: common_vendor.t($data.waterLevel),
    g: common_vendor.t($data.switches[0] ? "开" : "关"),
    h: $data.switches[0] ? 1 : "",
    i: !$data.switches[0] ? 1 : "",
    j: common_vendor.o(($event) => $options.sendCommand(0)),
    k: common_vendor.t($data.switches[1] ? "开" : "关"),
    l: $data.switches[1] ? 1 : "",
    m: !$data.switches[1] ? 1 : "",
    n: common_vendor.o(($event) => $options.sendCommand(1)),
    o: common_vendor.t($data.switches[2] ? "开" : "关"),
    p: $data.switches[2] ? 1 : "",
    q: !$data.switches[2] ? 1 : "",
    r: common_vendor.o(($event) => $options.sendCommand(2)),
    s: common_vendor.t($data.switches[3] ? "开" : "关"),
    t: $data.switches[3] ? 1 : "",
    v: !$data.switches[3] ? 1 : "",
    w: common_vendor.o(($event) => $options.sendCommand(3)),
    x: $data.showConnectionStatus
  }, $data.showConnectionStatus ? {
    y: common_vendor.t($data.connectionMessage)
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/index/index.js.map
