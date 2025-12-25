<template>
	<view class="container">
		<!-- 顶部状态栏 -->
		<view class="status-bar">
			<view class="status-item">
				<text class="status-label">状态</text>
				<text class="status-value" :class="{'online': isOnline, 'offline': !isOnline}">
					{{ isOnline ? '在线' : '离线' }}
				</text>
			</view>
		</view>
		
		<!-- 中间花朵和传感器数据区域 -->
		<view class="flower-container">
			<!-- 花朵图片 -->
			<view class="flower-wrapper">
				<view class="flower-image">
					<!-- 使用CSS创建花朵 -->
					<view class="flower-center"></view>
					<view class="petal petal-1"></view>
					<view class="petal petal-2"></view>
					<view class="petal petal-3"></view>
					<view class="petal petal-4"></view>
					<view class="petal petal-5"></view>
					<view class="petal petal-6"></view>
					<view class="petal petal-7"></view>
					<view class="petal petal-8"></view>
					<view class="stem"></view>
					<view class="leaf leaf-left"></view>
					<view class="leaf leaf-right"></view>
				</view>
			</view>
			
			<!-- 传感器数据显示 -->
			<view class="sensor-data">
				<view class="sensor-item">
					<text class="sensor-label">温度</text>
					<text class="sensor-value">{{ temperature }}°C</text>
				</view>
				<view class="sensor-item">
					<text class="sensor-label">湿度</text>
					<text class="sensor-value">{{ humidity }}%</text>
				</view>
				<view class="sensor-item">
					<text class="sensor-label">水位</text>
					<text class="sensor-value">{{ waterLevel }}cm</text>
				</view>
			</view>
		</view>
		
		<!-- 底部按钮区域 -->
		<view class="button-container">
			<button class="control-btn" :class="{'on': switches[0], 'off': !switches[0]}" @click="sendCommand(0)">
				开关1 {{ switches[0] ? '开' : '关' }}
			</button>
			<button class="control-btn" :class="{'on': switches[1], 'off': !switches[1]}" @click="sendCommand(1)">
				开关2 {{ switches[1] ? '开' : '关' }}
			</button>
			<button class="control-btn" :class="{'on': switches[2], 'off': !switches[2]}" @click="sendCommand(2)">
				开关3 {{ switches[2] ? '开' : '关' }}
			</button>
			<button class="control-btn" :class="{'on': switches[3], 'off': !switches[3]}" @click="sendCommand(3)">
				开关4 {{ switches[3] ? '开' : '关' }}
			</button>
		</view>
		
		<!-- 连接状态提示 -->
		<view class="connection-status" v-if="showConnectionStatus">
			<text>{{ connectionMessage }}</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				isOnline: false,
				temperature: 25,
				humidity: 60,
				waterLevel: 10,
				showConnectionStatus: false,
				connectionMessage: '',
				mqttClient: null,
				mqttOptions: {
					host: 'fnos.insane.vip', // MQTT服务器地址，可根据实际情况修改
					port: 8083, // WebSocket端口
					path: '/mqtt',
					clientId: 'uniapp_' + Math.random().toString(16).substr(2, 8),
					username: 'qq1739', // 用户名，如果需要
					password: '123456'  // 密码，如果需要
				},
				// 开关状态
				switches: [false, false, false, false], // sw1, sw2, sw3, sw4
				// 定时器
				statusTimer: null,
				// 连续无回复计数
				noReplyCount: 0,
				// 最大无回复次数
				maxNoReplyCount: 10
			}
		},
		onLoad() {
			this.initMQTT();
		},
		onUnload() {
			// 清理定时器
			if (this.statusTimer) {
				clearInterval(this.statusTimer);
			}
			// 关闭WebSocket连接
			uni.closeSocket();
		},
		methods: {
			// 初始化MQTT连接
			initMQTT() {
				try {
					// 使用WebSocket连接MQTT服务器
					const wsUrl = `ws://${this.mqttOptions.host}:${this.mqttOptions.port}${this.mqttOptions.path}`;
					this.mqttClient = uni.connectSocket({
						url: wsUrl,
						protocols: ['mqtt']
					});
					
					// 监听WebSocket连接打开事件
					uni.onSocketOpen(() => {
						console.log('MQTT连接成功');
						this.isOnline = true;
						this.showConnectionStatus = true;
						this.connectionMessage = 'MQTT服务器连接成功';
						
						// 连接成功后发送MQTT连接包
						this.sendMQTTConnect();
						
						// 启动定时器，每30秒发送一次cmd6
						this.statusTimer = setInterval(() => {
							this.sendInitCommand();
						}, 30000);
						
						// 3秒后隐藏连接状态提示
						setTimeout(() => {
							this.showConnectionStatus = false;
						}, 3000);
					});
					
					// 监听WebSocket接收到数据事件
					uni.onSocketMessage((res) => {
						console.log('收到MQTT消息:', res);
						this.handleMQTTMessage(res.data);
					});
					
					// 监听WebSocket错误事件
					uni.onSocketError((err) => {
						console.error('MQTT连接错误:', err);
						this.isOnline = false;
						this.showConnectionStatus = true;
						this.connectionMessage = 'MQTT连接失败，请检查网络';
					});
					
					// 监听WebSocket关闭事件
					uni.onSocketClose(() => {
						console.log('MQTT连接关闭');
						this.isOnline = false;
					});
					
				} catch (error) {
					console.error('初始化MQTT失败:', error);
					this.showConnectionStatus = true;
					this.connectionMessage = 'MQTT初始化失败';
				}
			},
			
			// 发送MQTT连接包
			sendMQTTConnect() {
				// 构建MQTT CONNECT包
				const clientId = this.mqttOptions.clientId;
				const username = this.mqttOptions.username;
				const password = this.mqttOptions.password;
				
				// 简化的MQTT CONNECT包（实际应用中应使用完整的MQTT协议实现）
				const connectPacket = this.buildMQTTConnectPacket(clientId, username, password);
				
				uni.sendSocketMessage({
					data: connectPacket
				});
				
				// 模拟连接成功，直接订阅主题和发送命令
				setTimeout(() => {
					this.subscribeTopic();
					this.sendInitCommand();
					
					// 启动定时器，每3秒发送一次cmd6
					this.statusTimer = setInterval(() => {
						this.sendInitCommand();
					}, 3000);
				}, 500);
			},
			
			// 构建简化的MQTT CONNECT包
			buildMQTTConnectPacket(clientId, username, password) {
				// 这是一个简化的实现，实际应用中应该使用完整的MQTT协议库
				// 这里我们发送一个JSON格式的连接信息
				const connectData = {
					cmd: 'CONNECT',
					clientId: clientId,
					username: username,
					password: password
				};
				return JSON.stringify(connectData);
			},
			
			// 订阅MQTT主题
			subscribeTopic() {
				// 发送SUBSCRIBE命令
				const subscribeMessage = {
					"cmd": "SUBSCRIBE",
					"topic": "mqttpub",
					"qos": 1
				};
				uni.sendSocketMessage({
					data: JSON.stringify(subscribeMessage)
				});
				console.log('已订阅主题: mqttpub');
			},
			
			// 发送初始化命令 {cmd:6}
			sendInitCommand() {
				const command = {"cmd": 6};
				uni.sendSocketMessage({
					data: JSON.stringify(command)
				});
				console.log('发送初始化命令:', JSON.stringify(command));
				
				// 增加无回复计数
				this.noReplyCount++;
				
				// 如果连续无回复次数达到阈值，标记设备为离线
				if (this.noReplyCount >= this.maxNoReplyCount && this.isOnline) {
					this.isOnline = false;
					console.log(`设备已离线，连续${this.noReplyCount}次无回复`);
				}
			},
			
			// 处理MQTT消息
			handleMQTTMessage(message) {
				try {
					const data = JSON.parse(message);
					console.log('收到MQTT消息:', data);
					
					// 如果是cmd6的回复，更新设备状态和数据
					if (data.cmd === 6 && data.data) {
						// 重置无回复计数器
						this.noReplyCount = 0;
						
						// 如果设备之前是离线状态，现在标记为在线
						if (!this.isOnline) {
							this.isOnline = true;
							console.log('设备已恢复在线');
						}
						
						// 更新传感器数据
						if (data.data.temp !== undefined) {
							this.temperature = data.data.temp;
						}
						if (data.data.humidity !== undefined) {
							this.humidity = data.data.humidity;
						}
						if (data.data.level !== undefined) {
							this.waterLevel = data.data.level;
						}
						
						// 更新开关状态
						if (data.data.sw && Array.isArray(data.data.sw) && data.data.sw.length >= 4) {
							// 将数字状态转换为布尔值
							this.switches = data.data.sw.map(state => state === 1);
						}
					}
					
					// 处理其他命令响应
					if (data.status) {
						console.log('设备状态:', data.status);
					}
					
				} catch (error) {
					console.error('解析MQTT消息失败:', error);
				}
			},
			
			// 发送开关控制命令
			sendCommand(switchIndex) {
				// 切换开关状态
				this.switches[switchIndex] = !this.switches[switchIndex];
				
				// 构建命令，确保字段名加双引号
				const command = {
					"cmd": switchIndex + 2, // cmd2对应开关1，cmd3对应开关2，以此类推
					"data": this.switches[switchIndex] ? 1 : 0 // 1表示开启，0表示关闭
				};
				
				uni.sendSocketMessage({
					data: JSON.stringify(command)
				});
				
				console.log('发送开关命令:', JSON.stringify(command));
				
				// 显示发送成功提示
				uni.showToast({
					title: `开关${switchIndex + 1}已${this.switches[switchIndex] ? '开启' : '关闭'}`,
					icon: 'success'
				});
			}
		}
	}
</script>

<style>
	.container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background-color: #f5f7fa;
		padding: 20rpx;
		box-sizing: border-box;
	}

	/* 顶部状态栏 */
	.status-bar {
		display: flex;
		justify-content: flex-end;
		padding: 20rpx 0;
	}

	.status-item {
		display: flex;
		align-items: center;
		background-color: #fff;
		padding: 10rpx 20rpx;
		border-radius: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
	}

	.status-label {
		font-size: 28rpx;
		color: #666;
		margin-right: 10rpx;
	}

	.status-value {
		font-size: 28rpx;
		font-weight: bold;
	}

	.online {
		color: #4CAF50;
	}

	.offline {
		color: #F44336;
	}

	/* 中间花朵和传感器区域 */
	.flower-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin: 40rpx 0;
	}

	.flower-wrapper {
		width: 400rpx;
		height: 400rpx;
		background-color: #fff;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.1);
		margin-bottom: 60rpx;
	}

	.flower-image {
		width: 300rpx;
		height: 300rpx;
		position: relative;
	}
	
	/* 花心 */
	.flower-center {
		position: absolute;
		width: 60rpx;
		height: 60rpx;
		background-color: #FFD700;
		border-radius: 50%;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10;
	}
	
	/* 花瓣 */
	.petal {
		position: absolute;
		width: 40rpx;
		height: 80rpx;
		background-color: #FF69B4;
		border-radius: 50%;
		top: 30%;
		left: 50%;
		transform-origin: center bottom;
	}
	
	.petal-1 { transform: translate(-50%, -50%) rotate(0deg); }
	.petal-2 { transform: translate(-50%, -50%) rotate(45deg); }
	.petal-3 { transform: translate(-50%, -50%) rotate(90deg); }
	.petal-4 { transform: translate(-50%, -50%) rotate(135deg); }
	.petal-5 { transform: translate(-50%, -50%) rotate(180deg); }
	.petal-6 { transform: translate(-50%, -50%) rotate(225deg); }
	.petal-7 { transform: translate(-50%, -50%) rotate(270deg); }
	.petal-8 { transform: translate(-50%, -50%) rotate(315deg); }
	
	/* 茎 */
	.stem {
		position: absolute;
		width: 20rpx;
		height: 120rpx;
		background-color: #228B22;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
	}
	
	/* 叶子 */
	.leaf {
		position: absolute;
		width: 40rpx;
		height: 20rpx;
		background-color: #228B22;
		border-radius: 50%;
		bottom: 60rpx;
	}
	
	.leaf-left {
		left: 35%;
		transform: rotate(-30deg);
	}
	
	.leaf-right {
		right: 35%;
		transform: rotate(30deg);
	}

	/* 传感器数据 */
	.sensor-data {
		display: flex;
		justify-content: space-around;
		width: 100%;
		margin-top: 40rpx;
	}

	.sensor-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		background-color: #fff;
		padding: 30rpx;
		border-radius: 20rpx;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
		min-width: 180rpx;
	}

	.sensor-label {
		font-size: 26rpx;
		color: #888;
		margin-bottom: 10rpx;
	}

	.sensor-value {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
	}

	/* 底部按钮区域 */
	.button-container {
		display: flex;
		justify-content: space-around;
		flex-wrap: wrap;
		padding: 20rpx 0;
	}

	.control-btn {
		width: 45%;
		height: 80rpx;
		margin: 10rpx 0;
		color: white;
		border: none;
		border-radius: 40rpx;
		font-size: 30rpx;
		font-weight: bold;
		transition: all 0.3s ease;
	}
	
	.control-btn.on {
		background: linear-gradient(135deg, #4CAF50, #8BC34A);
		box-shadow: 0 4rpx 15rpx rgba(76, 175, 80, 0.3);
	}
	
	.control-btn.off {
		background: linear-gradient(135deg, #9E9E9E, #757575);
		box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.2);
	}
	
	.control-btn:active {
		transform: translateY(2rpx);
	}

	/* 连接状态提示 */
	.connection-status {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 20rpx 40rpx;
		border-radius: 10rpx;
		font-size: 28rpx;
		z-index: 999;
	}
</style>
