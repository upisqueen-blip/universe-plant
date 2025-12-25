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
				<image class="flower-image" src="/static/flower.png" mode="aspectFit"></image>
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
			<button class="control-btn" @click="sendCommand(1)">浇水</button>
			<button class="control-btn" @click="sendCommand(2)">施肥</button>
			<button class="control-btn" @click="sendCommand(3)">调节光照</button>
			<button class="control-btn" @click="sendCommand(4)">查看状态</button>
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
					host: 'broker.emqx.io', // MQTT服务器地址，可根据实际情况修改
					port: 8083, // WebSocket端口
					path: '/mqtt',
					clientId: 'uniapp_' + Math.random().toString(16).substr(2, 8),
					username: '', // 用户名，如果需要
					password: ''  // 密码，如果需要
				}
			}
		},
		onLoad() {
			this.initMQTT();
		},
		onUnload() {
			if (this.mqttClient) {
				this.mqttClient.disconnect();
			}
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
					
					this.mqttClient.onOpen(() => {
						console.log('MQTT连接成功');
						this.isOnline = true;
						this.showConnectionStatus = true;
						this.connectionMessage = 'MQTT服务器连接成功';
						
						// 连接成功后订阅主题
						this.subscribeTopic();
						
						// 发送初始化命令 {cmd:6}
						this.sendInitCommand();
						
						// 3秒后隐藏连接状态提示
						setTimeout(() => {
							this.showConnectionStatus = false;
						}, 3000);
					});
					
					this.mqttClient.onMessage((res) => {
						console.log('收到MQTT消息:', res.data);
						this.handleMQTTMessage(res.data);
					});
					
					this.mqttClient.onError((err) => {
						console.error('MQTT连接错误:', err);
						this.isOnline = false;
						this.showConnectionStatus = true;
						this.connectionMessage = 'MQTT连接失败，请检查网络';
					});
					
					this.mqttClient.onClose(() => {
						console.log('MQTT连接关闭');
						this.isOnline = false;
					});
					
				} catch (error) {
					console.error('初始化MQTT失败:', error);
					this.showConnectionStatus = true;
					this.connectionMessage = 'MQTT初始化失败';
				}
			},
			
			// 订阅MQTT主题
			subscribeTopic() {
				if (this.mqttClient && this.mqttClient.readyState === 1) {
					// 发送SUBSCRIBE命令
					const subscribeMessage = {
						cmd: 'SUBSCRIBE',
						topic: 'mqttsub',
						qos: 1
					};
					this.mqttClient.send({
						data: JSON.stringify(subscribeMessage)
					});
					console.log('已订阅主题: mqttsub');
				}
			},
			
			// 发送初始化命令 {cmd:6}
			sendInitCommand() {
				if (this.mqttClient && this.mqttClient.readyState === 1) {
					const command = {cmd: 6};
					this.mqttClient.send({
						data: JSON.stringify(command)
					});
					console.log('发送初始化命令:', command);
				}
			},
			
			// 处理MQTT消息
			handleMQTTMessage(message) {
				try {
					const data = JSON.parse(message);
					
					// 更新传感器数据
					if (data.temperature !== undefined) {
						this.temperature = data.temperature;
					}
					if (data.humidity !== undefined) {
						this.humidity = data.humidity;
					}
					if (data.waterLevel !== undefined) {
						this.waterLevel = data.waterLevel;
					}
					
					// 处理其他命令响应
					if (data.status) {
						console.log('设备状态:', data.status);
					}
					
				} catch (error) {
					console.error('解析MQTT消息失败:', error);
				}
			},
			
			// 发送命令
			sendCommand(cmdType) {
				if (!this.mqttClient || this.mqttClient.readyState !== 1) {
					uni.showToast({
						title: 'MQTT未连接',
						icon: 'none'
					});
					return;
				}
				
				const command = {cmd: cmdType};
				this.mqttClient.send({
					data: JSON.stringify(command)
				});
				
				console.log('发送命令:', command);
				
				// 显示发送成功提示
				uni.showToast({
					title: '命令已发送',
					icon: 'success'
				});
			}
		}
	}
</script>

<style>
	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.logo {
		height: 200rpx;
		width: 200rpx;
		margin-top: 200rpx;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 50rpx;
	}

	.text-area {
		display: flex;
		justify-content: center;
	}

	.title {
		font-size: 36rpx;
		color: #8f8f94;
	}
</style>
