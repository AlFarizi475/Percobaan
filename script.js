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
    sensor_temp: mqtt_config.base_topic + 'sensor/suhu',
    sensor_air_humi: mqtt_config.base_topic + 'sensor/kelembaban_udara',
    pump_status: mqtt_config.base_topic + 'status/pompa'
};

let client;

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

function onConnect() {
    const badge = document.getElementById("mqtt-status");
    const statusText = document.getElementById("mqtt-status-text");
    badge.className = "status-badge connected";
    statusText.innerText = "Status: Terhubung";

    client.subscribe(topics.sensor_humi1);
    client.subscribe(topics.sensor_temp);
    client.subscribe(topics.sensor_air_humi);
    client.subscribe(topics.pump_status);
}

function onFailure(responseObject) {
    const badge = document.getElementById("mqtt-status");
    const statusText = document.getElementById("mqtt-status-text");
    badge.className = "status-badge disconnected";
    statusText.innerText = "Gagal: " + responseObject.errorMessage;
    setTimeout(connectMQTT, 5000);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        const badge = document.getElementById("mqtt-status");
        const statusText = document.getElementById("mqtt-status-text");
        badge.className = "status-badge disconnected";
        statusText.innerText = "Terputus. Menghubungkan ulang...";
        setTimeout(connectMQTT, 5000);
    }
}

function onMessageArrived(message) {
    const payload = message.payloadString;

    // 1. Kelembapan Tanah
    if (message.destinationName === topics.sensor_humi1) {
        const val = parseFloat(payload) || 0;
        document.getElementById("humi1-val").innerHTML = `${val}<small>%</small>`;
        document.getElementById("soil-progress").style.width = Math.min(val, 100) + "%";
    } 
    // 2. Suhu Udara (DHT11)
    else if (message.destinationName === topics.sensor_temp) {
        const val = parseFloat(payload) || 0;
        document.getElementById("temp-val").innerHTML = `${val}<small>°C</small>`;
        const percentage = Math.min((val / 50) * 100, 100);
        document.getElementById("temp-progress").style.width = percentage + "%";
    } 
    // 3. Kelembapan Udara (DHT11)
    else if (message.destinationName === topics.sensor_air_humi) {
        const val = parseFloat(payload) || 0;
        document.getElementById("air-humi-val").innerHTML = `${val}<small>%</small>`;
        document.getElementById("air-humi-progress").style.width = Math.min(val, 100) + "%";
    }
    // 4. Status Pompa
    else if (message.destinationName === topics.pump_status) {
        const statusBox = document.getElementById("pump-status");
        const statusText = document.getElementById("pump-status-text");

        statusBox.className = "pump-indicator";

        if (payload === "ON") {
            statusText.innerText = "Status Pompa: HIDUP (MANUAL)";
            statusBox.classList.add("on");
        } else if (payload === "OFF") {
            statusText.innerText = "Status Pompa: MATI";
            statusBox.classList.add("off");
        } else if (payload === "AUTO") {
            statusText.innerText = "Status Pompa: MODE OTOMATIS";
            statusBox.classList.add("auto");
        }
    }
}

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

window.onload = connectMQTT;