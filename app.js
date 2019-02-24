var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');
var path = require('path')
var fs = require("fs");
const bodyParser = require("body-parser");
var urlencodedParser = bodyParser.urlencoded({extended: false});
var mqtt = require('mqtt');
var client = mqtt.connect('mqtt:/192.168.1.3:1883');
var mysql = require('mysql');
const { spawn } = require('child_process');

var serverJSON = {};
var ip_base = [];

var homeSQL = mysql.createConnection({
  host     : 'host',
  user     : 'user',
  password : 'pass',
  database : 'base
});
var hostingSQL = mysql.createConnection({
  host     : 'host',
  user     : 'user',
  password : 'pass',
  database : 'base'
});

homeSQL.connect();
hostingSQL.connect();

function time() {
  var date = new Date();

  var Year = date.getFullYear();
  var Month = date.getMonth() + 1;

  var start = date.getDate() + '.' + Month + '.' + Year + ' ' + date.getHours() + ':' + date.getMinutes();
  return start;
}

function mqtt_base() {

  homeSQL.query("SELECT `state` FROM `state` WHERE `device` = 'sonoff_top'", function (error, results, fields) {
    if (error) throw error;
    serverJSON['sonoff_top'] = results[0].state;
  });
  homeSQL.query("SELECT `state` FROM `state` WHERE `device` = 'sonoffpbasic'", function (error, results, fields) {
    if (error) throw error;
    serverJSON['sonoffpbasic'] = results[0].state;
  });

}

app.use(bodyParser.json());

app.post("/temp", function (req, res) {
  res.end('OK');

  homeSQL.query("INSERT INTO my_room_temp(`values`, `time`) VALUES ('" + req.body[0] + "', '" + time() + "')", function (error, results, fields) {
    if (error) throw error;
  });

});

app.post("/hum", function (req, res) {
  res.end('OK');
  homeSQL.query("INSERT INTO my_room_hum(`values`, `time`) VALUES ('" + req.body[0] + "', '" + time() + "')", function (error, results, fields) {
    if (error) throw error;
  });
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});
app.get('/phpMyAdmin', function(req, res){
  res.sendFile(__dirname + '/phpMyAdmin/');
});

app.get('/server.json', function(req, res){
  res.sendFile(__dirname + '/server.json');
});

app.get('/ip_base.json', function(req, res){
  res.sendFile(__dirname + '/ip_base.json');
});

app.use(express.static(path.join(__dirname, 'media')));

http.listen(3000, function(){
  setTimeout(function () {
    console.log('============ UPDATE ============\n');
    console.log('IP: ' + serverJSON.ip);
    if (ip_updated != '') {
      console.log('- ' + ip_updated + '\n');
      ip_updated = '';
    } else {console.log('')};
    console.log('Внутреняя память:\n' + 'Занято ' + serverJSON.rom_fill + 'Мб из ' + serverJSON.rom_full + 'Мб (' + serverJSON.rom_proc + '%)\n');
    console.log('Оперативная память:\n' + 'Занято ' + serverJSON.ram_fill + 'Мб из ' + serverJSON.ram_full + 'Мб (' + serverJSON.ram_proc + '%)\n');
    console.log('MQTT:');
    console.log('Свет (потолок) - ' + serverJSON.sonoff_top);
    console.log('Розетка (Стол) - ' + serverJSON.sonoffpbasic + '\n');
    console.log('================================\n');;
  }, 3000);
});



function rom_memory() {
  const df = spawn('df', ['-h']);

  df.stdout.on('data', (data) => {
    var df_out = data.toString().split(' ');
    var df = new Array();
    var j = 0;

    for (var i = 0; i < df_out.length; i++) {
      if (df_out[i] != '') {
        if (df_out[i] == "Mounted") {
          df[j] = df_out[i] + ' ' + df_out[(i+1)];
          i++;
        } else {
          df[j] = df_out[i];
        }
        j++;
      }
    }

    var rom_fill = parseFloat(df[17].substr(0, df[17].length - 1)) * 1024; // Всего  памяти
    var rom_full = parseFloat(df[16].substr(0, df[16].length - 1)) * 1024; // Занято памяти
    var rom_proc = Math.ceil((rom_fill*100)/rom_full);

    serverJSON['rom_full'] = rom_full;
    serverJSON['rom_fill'] = rom_fill;
    serverJSON['rom_proc'] = rom_proc;

    // console.log('\nВстроенная память:\nЗанято ' + rom_fill + 'Мб из ' + rom_full + 'Мб  (' + rom_proc + '%)' + '\n');
  });
}

function ram_memory() {
  const free = spawn('free', ['-h']);

  free.stdout.on('data', (data) => {
    var free_out = data.toString().split(' ');
    var free = new Array();
    var j = 0;

    for (var i = 0; i < free_out.length; i++) {
      if (free_out[i] != '') {
        free[j] = free_out[i];
        j++;
      }
    }

    var ram_fill = parseFloat(free[7].substr(0, free[7].length - 1)); // Всего  памяти
    var ram_full = parseFloat(free[6].substr(0, free[6].length - 3)) * 1024; // Занято памяти
    var ram_proc = Math.ceil((ram_fill*100)/ram_full);

    serverJSON['ram_full'] = ram_full;
    serverJSON['ram_fill'] = ram_fill;
    serverJSON['ram_proc'] = ram_proc;

    // console.log('Оперативная память:\nЗанято ' + ram_fill + 'Мб из ' + ram_full + 'Мб  (' + ram_proc + '%)' + '\n');
  });
}

var ip_updated = '';
var ipArr;
function ip_static() {
  var new_ip;
  var base_ip;
  var url = 'https://api.ipify.org/?format=json';

  request.get({
    url: url,
    json: true,
    headers: {'User-Agent': 'request'}
  }, (err, res, data) => {
    if (err) {
      console.log('Ошибка при обновлении IP');
    } else if (res.statusCode !== 200) {
      console.log('Status:', res.statusCode);
    } else {
      new_ip = data.ip;
      serverJSON['ip'] = new_ip;
    }
  });

  hostingSQL.query("SELECT * FROM server WHERE time='LAST'", function (error, results, fields) {
    if (error) throw error;
    base_ip = results[0].ip;
  });

  hostingSQL.query("SELECT * FROM (SELECT * FROM server ORDER BY id DESC LIMIT 3) AS T ", function (error, results, fields) {
    if (error) throw error;
    ipArr = ([
      [{
        "ip": results[2].ip,
        "time": results[2].time
      }],
      [{
        "ip": results[1].ip,
        "time": results[1].time
      }],
      [{
        "ip": results[0].ip,
        "time": results[0].time
      }]
    ])
    serverJSON['ipArray'] = ipArr;
  });

  setTimeout(function () {

    if (base_ip != new_ip && new_ip != '' && new_ip != 'undefined') {
      hostingSQL.query("INSERT INTO server(ip, time) VALUES ('" + new_ip + "', '" + time() + "')", function (error, results, fields) {
        if (error) throw error;
      });
      hostingSQL.query("UPDATE server SET ip='" + new_ip + "' WHERE id='1'", function (error, results, fields) {
        if (error) throw error;
      });
      ip_updated = 'IP успешно обновлен!'
    }
  }, 5000);
}

function ipBase() {
  hostingSQL.query("SELECT * FROM server", function (error, results, fields) {
    serverJSON['ipListLength'] = results.length;
    for (var i = 0; i < results.length; i++) {
      ip_base[i] = [{
        "ip": results[i].ip,
        "time": results[i].time
      }]
    }
    setTimeout(function () {
      fs.writeFile( "ip_base.json", JSON.stringify(ip_base, null, 2), (error) => {});
    }, 2000);
  });
}
ipBase();

function sensors() {
  var tempArr = [];
  var humArr = [];

  homeSQL.query("SELECT * FROM (SELECT * FROM my_room_temp ORDER BY id DESC LIMIT 10) AS T", function (error, results, fields) {
    if (error) throw error;
    for (var i = 0; i < 10; i++) {
      tempArr[i] = results[i].values;
    }
  });

  homeSQL.query("SELECT * FROM (SELECT * FROM my_room_hum ORDER BY id DESC LIMIT 10) AS T", function (error, results, fields) {
    if (error) throw error;
    for (var i = 0; i < 10; i++) {
      humArr[i] = results[i].values;
    }
  });

  setTimeout(function () {
    serverJSON['temp'] = tempArr;
    serverJSON['Hum'] = humArr;
  }, 1000);


}
sensors();

function update() {
  ip_static();
  ipBase();
  rom_memory();
  ram_memory();
  mqtt_base();

  setTimeout(function () {
    fs.writeFile( "server.json", JSON.stringify(serverJSON, null, 2), (error) => {});
  }, 200);

  setTimeout(function () {
    update();
  }, 300000);
}
update();


io.on('connection', function(socket){
  console.log('User connected');
  update();
  socket.on('disconnect', function(){
    console.log('User disconnected');
  });

  socket.on('socket-mqtt', function(device, mode){
    if (device) {
      console.log('[socket][mqtt] ' + device + ' -> ' + mode);
      client.publish("cmnd/" + device + "/POWER", mode);

      homeSQL.query("UPDATE `state` SET `state`='" + mode + "' WHERE `device`='" + device + "'", function (error, results, fields) {
        if (error) throw error;
      });
      update();
    }
  });

});
