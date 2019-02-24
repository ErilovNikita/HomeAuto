var socket = io();

var request = new XMLHttpRequest();
request.open("GET", "./server.json", false);
request.send(null)
var serverJSON = JSON.parse(request.responseText);
if (request.responseText) {
  notification("Данные получены и успешно обновлены!", "success");
}

var request = new XMLHttpRequest();
request.open("GET", "./ip_base.json", false);
request.send(null)
var ipBaseJSON = JSON.parse(request.responseText);


$('#first-ip').html(serverJSON.ip);
$('#ipLength').html(serverJSON.ipListLength);
document.getElementById('ip-block').getElementsByTagName('p')[0].append(serverJSON.ipArray[0][0].ip);
document.getElementById('ip-block').getElementsByTagName('p')[1].append(serverJSON.ipArray[1][0].ip);
document.getElementById('ip-block').getElementsByTagName('p')[2].append(serverJSON.ipArray[2][0].ip);
document.getElementById('ip-block').getElementsByTagName('strong')[0].append(serverJSON.ipArray[0][0].time);
document.getElementById('ip-block').getElementsByTagName('strong')[1].append(serverJSON.ipArray[1][0].time);
document.getElementById('ip-block').getElementsByTagName('strong')[2].append(serverJSON.ipArray[2][0].time);

$('#rom_fill').html((serverJSON.rom_fill / 1024) + 'Гб');
$('#rom_full').html((serverJSON.rom_full / 1024) + 'Гб');
$('#rom_proc').width(serverJSON.rom_proc + '%');

$('#ram_fill').html((serverJSON.ram_fill) + 'Мб');
$('#ram_full').html((serverJSON.ram_full / 1024) + 'Гб');
$('#ram_proc').width(serverJSON.ram_proc + '%');

if (serverJSON.sonoff_top.toLowerCase() == 'on') { $('.mqtt.sonoff_top').removeClass('on').addClass('off'); }
if (serverJSON.sonoffpbasic.toLowerCase() == 'on') { $('.mqtt.sonoffpbasic').removeClass('on').addClass('off'); }

$('#secondHum').html((serverJSON.Hum[0]) + '%');
$('#secondTemp').html((serverJSON.temp[0]) + '°C');

var links_bar = document.getElementById('link-on-bar').getElementsByTagName('a');
links_bar[1].setAttribute("href", "http://" + serverJSON.ip + ":8888");
links_bar[2].setAttribute("href", "ssh://erilovnikita@" + serverJSON.ip);
links_bar[3].setAttribute("href", "smb://erilovnikita@" + serverJSON.ip);
links_bar[4].setAttribute("href", "#");
links_bar[5].setAttribute("href", "http://" + serverJSON.ip + ":1880");
links_bar[6].setAttribute("href", "http://" + serverJSON.ip + "/phpMyAdmin/");
links_bar[7].setAttribute("href", "http://transmission:transmission@" + serverJSON.ip + ":9091");


for (var i = 0; i < ipBaseJSON.length; i++) {
  $('#ipList').append('<li class="list-group-item d-flex justify-content-between align-items-center">' + ipBaseJSON[i][0].ip + '<span class="badge badge-primary badge-pill">' + ipBaseJSON[i][0].time + '</span></li>');
}


var not = document.getElementById("not");
var notification_count = 0;
function notification(message, mode) {

  var div = document.createElement('div');
  switch (mode) {
    case "success":
      div.classList.add('alert-success');
      break;
    case "warning":
      div.classList.add('alert-warning');
      break;
    case "danger":
      div.classList.add('alert-danger');
      break;
    default:
      div.classList.add('alert-primary');
  }

  div.classList.add('notification_'+notification_count, 'alert', 'shadow-sm');

  $("#not").prepend(div);
  var native_not = document.getElementsByClassName('notification_'+notification_count);
  $('.notification_'+notification_count).append(message);

  setTimeout(function () {
    div.classList.add('on');
  }, 10);

  setTimeout(function () {
    div.classList.remove('on');
    setTimeout(function () {
      div.remove();
    }, 1000);
  }, 220 * message.length);
  notification_count++;
}

window.onload = function() {

  var body = document.getElementsByTagName('body')[0];
  var main = document.getElementsByTagName('main')[0];

  function getCookie(name) {
    var matches = document.cookie.match(new RegExp(
      "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
  }

  new Chartist.Line('.ct-hum', {
                labels: [1, 2, 3, 4],
                series: [serverJSON.Hum],
              }, {low: 0, showArea: true, showLine: false, showPoint: false, fullWidth: true,
                  axisX: {showLabel: false,
                          showGrid: false}
              });
  new Chartist.Line('.ct-temp', {
                labels: [1, 2, 3, 4],
                series: [serverJSON.temp],
              }, {low: 0, showArea: true, showLine: false, showPoint: false, fullWidth: true,
                  axisX: {showLabel: false,
                          showGrid: false}
              });


  $('form').submit(function(){
    socket.emit('chat message', $('#m').val());
    $('#m').val('');
    return false;
  });
  socket.on('chat message', function(msg){
    $('#messages').append($('<li>').text(msg));
  });

  socket.on('cmd', function(msg){

  });

  $(".mqtt").click(function(e) {
    if(this.className.indexOf('sonoffpbasic') + 1) {
      var device = 'sonoffpbasic';
      var mode = this.className.substr((this.className.length - 3), 3);
      if (mode == 'off') {
        notification("Свет выключен!", "warning");
        this.classList.remove("off");
        this.classList.add("on");
        this.getElementsByTagName('p')[0].textContent = "Выключен";
      } else {
        notification("Свет включен!", "success");
        this.classList.remove("on");
        this.classList.add("off");
        this.getElementsByTagName('p')[0].textContent = "Включен";
        mode = 'on';
      }
    } else if (this.className.indexOf('sonoff_top') + 1) {
      var device = 'sonoff_top';
      var mode = this.className.substr((this.className.length - 3), 3);
      if (mode == 'off') {
        notification("Свет выключен!", "warning");
        this.classList.remove("off");
        this.classList.add("on");
        this.getElementsByTagName('p')[0].textContent = "Выключен";
      } else {
        notification("Свет включен!", "success");
        this.classList.remove("on");
        this.classList.add("off");
        this.getElementsByTagName('p')[0].textContent = "Включен";
        mode = 'on';
      }
    }

    socket.emit('socket-mqtt', device, mode);

  });
}
