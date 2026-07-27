// --- KONFIGURASI HIVEMQ CLOUD ---
const mqtt_config = {
    broker: '76ead1d5a6824f05a688fb4335fe9d68.s1.eu.hivemq.cloud',
    port: 8884, // Port WebSocket TLS
    username: 'Petani Desa',
    password: 'Petanidesa',
    base_topic: 'pertanian/'
};

// Topik MQTT
const topics = {
    control: mqtt_config.base_topic + 'kontrol',
    timer: mqtt_config.base_topic + 'timer',
    sensor_humi1: mqtt_config.base_topic + 'sensor/kelembaban1',
    pump_status: mqtt_config.base_topic + 'status/pompa'
};

let client;

// --- FUNGSI KONEKSI KE BROKER MQTT ---
function connectMQTT() {
    const clientId = "WebClient_" + Math.random().toString(16).substr(2, 8);
    client = new Paho.MQTT.Client(mqtt_config.broker, mqtt_config.port, clientId);

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    const options = {
        useSSL: true,
        userName: mqtt_config.username,
        password: mqtt_config.password,
        onSuccess: onConnect,
        onFailure: onFailure
    };

    client.connect(options);
}

// Terhubung Sukses
function onConnect() {
    const badge = document.getElementById("mqtt-status");
    badge.className = "status-badge connected";
    badge.innerText = "Status Penyandingan: Terhubung";

    // Subscribe topik sensor & status dari ESP32
    client.subscribe(topics.sensor_humi1);
    client.subscribe(topics.pump_status);
}

// Gagal Terhubung
function onFailure(responseObject) {
    const badge = document.getElementById("mqtt-status");
    badge.className = "status-badge disconnected";
    badge.innerText = "Gagal Terhubung: " + responseObject.errorMessage;
    setTimeout(connectMQTT, 5000);
}

// Koneksi Terputus
function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        const badge = document.getElementById("mqtt-status");
        badge.className = "status-badge disconnected";
        badge.innerText = "Koneksi Terputus. Menghubungkan ulang...";
        setTimeout(connectMQTT, 5000);
    }
}

// --- MENERIMA DATA REAL-TIME DARI ESP32 ---
function onMessageArrived(message) {
    if (message.destinationName === topics.sensor_humi1) {
        document.getElementById("humi1-val").innerText = message.payloadString + "%";
    } 
    else if (message.destinationName === topics.pump_status) {
        const statusBox = document.getElementById("pump-status");
        if (message.payloadString === "ON") {
            statusBox.innerText = "Status Pompa: HIDUP (MANUAL)";
            statusBox.style.background = "#dcfce7";
            statusBox.style.color = "#15803d";
        } else if (message.payloadString === "OFF") {
            statusBox.innerText = "Status Pompa: MATI";
            statusBox.style.background = "#fee2e2";
            statusBox.style.color = "#b91c1c";
        } else if (message.payloadString === "AUTO") {
            statusBox.innerText = "Status Pompa: MODE OTOMATIS";
            statusBox.style.background = "#dbeafe";
            statusBox.style.color = "#1d4ed8";
        }
    }
}

// --- MENGIRIM PERINAH KONTROL KE ESP32 ---
function sendControl(command) {
    if (client && client.isConnected()) {
        const message = new Paho.MQTT.Message(command);
        message.destinationName = topics.control;
        client.send(message);
    } else {
        alert("Gagal mengirim! Web belum terhubung ke HiveMQ.");
    }
}

function sendTimer() {
    const timerVal = document.getElementById("timer-input").value;
    if (client && client.isConnected()) {
        const message = new Paho.MQTT.Message(timerVal.toString());
        message.destinationName = topics.timer;
        client.send(message);
        alert("Timer berhasil dikirim: " + timerVal + " Menit");
    } else {
        alert("Gagal mengirim! Web belum terhubung ke HiveMQ.");
    }
}

// Otomatis jalankan fungsi koneksi saat halaman dibuka
window.onload = connectMQTT;