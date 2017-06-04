var bRotate = false;// 旋转的状态
var hasDrawed = false;
$(document).ready(function() {
  if (typeof localStorage.errcode === 'undefined') {
    alert('您不能不注册就来抽奖！');
    return;
  }

  $.ajax({
    type: "GET",
    url: "data/data1.json",
    data: {},
    dataType: "json",
    success: function(data) {
      var wheel = data;
      var prizes = wheel.prizes;
      console.log(wheel);
      drawWheelCanvas(wheel);// 画转盘

      $('.pointer').click(function() {
        if (hasDrawed) {
          alert("您已经抽过奖，不要贪心");
          return;
        }
        // hasDrawed = true;    // 抽过奖  // todo: 别忘改过来
        if (bRotate) return; // 正在转动，点击无效
        bRotate = !bRotate;  // 将转盘状态置为正在转动
        var rnd = Math.random();
        var position = getPosition(rnd, prizes);// 获取奖项的位置
        rotateFunc(position, prizes);// 开始抽奖，并上传结果
        console.log(getObjProb(prizes));

        // 进行海量测试
        var pracProb = getPracProb(20000, prizes);// 实际中奖情况
        console.log(pracProb);

      });
    },
    error: function(data){
      alert("网络错误，请检查您的网络设置！");
      $("#tip").text("请求数据失败");
    }
  });
});

/* ---------- 函数定义部分 ---------- */

/**
 * 统计数组中某元素的个数, 不存在会返回 0
 * @param  el 数组元素
 * @return    数组元素的个数
 */
Array.prototype.numOf = function(el){
  var sum = 0;
  for (var _el of this) {
    if (_el === el) {
      sum++;
    }
  }
  return sum;
};

/**
 * 数组求和
 * @return 数组的和
 */
Array.prototype.arrSum = function () {
  var s = 0;
  for (var val of this) {
    s+= val;
  }
  return s;
};


function getPracProb(cnt, prizes) {
  var rnd = null;
  var position = null;
  var pracProb = {};
  var idx = null;
  for (var i = 0; i < cnt; i++) {
    rnd = Math.random();
    position = getPosition(rnd, prizes);
    idx = prizes[position].no;
    if (typeof pracProb[idx] === 'undefined') {
      pracProb[idx] = {num: 1, prob: null};
    } else {
      pracProb[idx].num++;
    }
  }
  var sum = 0;
  for (let key in pracProb) {
    sum+= pracProb[key].num;
  }
  for (let key in pracProb) {
    pracProb[key].prob = pracProb[key].num/sum;
  }

  return pracProb;
}

/**
 * 抽奖结果上传
 * @param  prize 奖品代号，1 一等奖 2 二等奖 3 三等奖 0 未中奖 9 特等奖
 * @return 无
 */
function submitResult(prize) {
  $.ajax({
    url: 'http://taikangsc.com:9080/Tkscwx/servlet/com.base.InsertHdlServlet',
    type: 'POST',
    dataType: 'jsonp',
    data: {
      'telno': localStorage.telno,
      'agntnum': localStorage.agntnum,
      'prize': prize,
      'hdl_type': 1,
      'acctid': 2
    }
  })
  .done(function() {
    console.log("success");
  })
  .fail(function() {
    console.log("error");
  })
  .always(function() {
    console.log("complete");
  });
}

/**
 * 旋转转盘并上传结果
 * @param  position 奖品序号，从 0 开始
 * @param  prizes   奖品数组
 * @return 无
 */
function rotateFunc(position, prizes) {
  var name = prizes[position].name;       // 奖品名称，如：一等奖
  var content =  prizes[position].content;// 奖品内容，如：卫生纸
  var count =  prizes.length;              // 奖品个数，决定转盘分成几份
  var baseAngle = 360 / count;            // 转盘的每份所占的角度
  // 旋转角度 == 270°（当前第一个角度和指针位置的偏移量） - 奖品的位置 * 每块所占的角度 - 每块所占的角度的一半(指针指向区域的中间)
  var angles = 270 - (position * baseAngle) - baseAngle / 2; // 因为第一个奖品是从0°开始的，即水平向右方向
  $('#wheelCanvas').stopRotate();
  $('#wheelCanvas').rotate({
    angle: 0,// 初始旋转的角度数，并且立即执行
    animateTo: angles + 360 * 5,// 这里多旋转了5圈，圈数越多，转的越快
    duration: 5000,// 旋转时间
    callback: function() {// 回调方法，转盘转完后的动作
      $(".tips .prize-name span").html(name);
      $(".tips .prize-content span").html(content);
      $(".tips").show();
      bRotate = !bRotate;// 解除旋转中状态
      // 抽奖结果上传
      // prize     1 一等奖 2 二等奖 3 三等奖 0 未中奖 9 特等奖
      submitResult(prizes[position].no);
    }
  });
}

/**
 * 返回 m 到 n 之间的随机整数
 * @param  m      下限
 * @param  n      上限
 * @return 随机整数
 */
function randomNum(m, n) {
  return m + Math.floor(Math.random() * (n - m));
}

/**
 * 统计概率不为零的奖项，放到 objProb 里，每个包括：位置数组和概率两个字段
 */
function getObjProb(prizes) {
  var objProb = {};
  var prize = null;

  for(var i=0; i<prizes.length; i++) {
    prize = prizes[i];
    if (typeof objProb[prize.id] === 'undefined') {// 第一次统计到某个奖项
      objProb[prize.id] = {
        pos: [i]
      };
      if (typeof prize.prob !== 'undefined' && prize.prob) {
        objProb[prize.id].prob = prize.prob;
      } else {
        objProb[prize.id].prob = 0;
      }
    } else {
      objProb[prize.id].pos.push(i);
      if (typeof prize.prob !== 'undefined' && prize.prob) {
        objProb[prize.id].prob = prize.prob;
      }
    }
  }
  // 删掉概率为零的
  for (let key in objProb) {
    if (objProb[key].prob === 0) {
      delete objProb[key];
    }
  }
  return objProb;
}

/**
 * 根据随机数得到奖项的位置
 * @param  rnd    0 ~ 1 随机数
 * @param  prizes 奖项数组
 * @return        奖项位置，0 ~ n-1
 */
function getPosition(rnd, prizes) {
  var objProb = getObjProb(prizes);
  var leftEnd = 0;   // 每个概率区间的左端点
  var rightEnd = 0;  // 每个概率区间的右端点
  var yourPrize;
  var position = null;
  for (let key in objProb) {
    rightEnd = leftEnd + objProb[key].prob;
    if (rnd >= leftEnd && rnd <= rightEnd) {
      yourPrize = key;
      // 随机选择该奖的位置, 如：三等奖在 8, 10 两个位置
      let rndIdx = Math.round(Math.random()*(objProb[key].pos.length-1));
      position = objProb[key].pos[rndIdx];
      break;
    }
    leftEnd = rightEnd;
  }
  return position;
}

/**
 * 根据参数绘制转盘
 * @return 无
 */
function drawWheelCanvas(wheel) {
  var prizes = wheel.prizes;
  var canvas = document.getElementById("wheelCanvas");
  var ctx = canvas.getContext("2d");
  var baseAngle = 2*Math.PI / (prizes.length);// arc() 函数以弧度为单位，小心
  var canvasW = canvas.width;
  var canvasH = canvas.height;
  //在给定矩形内清空一个矩形
  ctx.clearRect(0, 0, canvasW, canvasH);

  ctx.strokeStyle = "#FFBE04";
  ctx.font = '16px Microsoft YaHei';

  // 开始画的位置是从0°角的位置开始画的, 也就是水平向右的方向
  var center = {// 圆心
    x: canvasW * 0.5,
    y: canvasH * 0.5
  };
  for (var i=0; i<prizes.length; i++) {
    var prize = prizes[i];
    var angle = i * baseAngle;// 每块区域的起始角度
    ctx.fillStyle = prize.color;// 背景色
    // 开始画内容
    // ---------基本的背景颜色----------
    ctx.beginPath();
    ctx.arc(center.x, center.y, wheel.outerRadius, angle, angle + baseAngle);// 顺时针
    ctx.arc(center.x, center.y, wheel.innerRadius, angle + baseAngle, angle, true); // 逆时针
    ctx.stroke();
    ctx.fill();
    //保存画布的状态，和图形上下文栈类似，后面可以Restore还原状态（坐标还原为当前的0，0），
    ctx.save();

    /*----绘制奖品内容-----*/
    ctx.fillStyle = "#E5302F";
    var line_height = 17;

    // translate 方法重新映射画布上的 (0,0) 位置, 改变旋转中心
    var translateX = Math.cos(angle + baseAngle / 2) * wheel.textRadius + canvasW * 0.5;
    var translateY = Math.sin(angle + baseAngle / 2) * wheel.textRadius + canvasH * 0.5;
    ctx.translate(translateX, translateY);

    // rotate 方法旋转当前的绘图，因为文字是和当前扇形中心线垂直的！
    // angle，当前扇形自身旋转的角度 +  baseAngle / 2 中心线多旋转的角度  + 垂直的角度90°
    // 顺时针，弧度制
    var rotateAngle = angle + baseAngle / 2 + Math.PI / 2;
    console.log(angle, translateX, translateY, rotateAngle);
    ctx.rotate(rotateAngle);

    /** 下面代码根据奖品类型、奖品名称长度渲染不同效果，如字体、颜色、图片效果。(具体根据实际情况改变) **/
    // measureText() 方法返回包含一个对象，该对象包含以像素计的指定字体宽度。
    // fillText() 方法在画布上绘制填色的文本。文本的默认颜色是黑色. fillStyle 属性以另一种颜色/渐变来渲染文本
    /*
     * context.fillText(text,x,y,maxWidth);
     * 注意！！！y是文字的最底部的值，并不是top的值！！！
     * */
     // writeText();


    //在画布上绘制填色的文本。文本的默认颜色是黑色
    ctx.font = 'bold 20px Microsoft YaHei';
    ctx.fillText(prize.name, -ctx.measureText(prize.name).width / 2, -10);
    ctx.font = '16px Microsoft YaHei';
    ctx.fillText(prize.content, -ctx.measureText(prize.content).width / 2, 13);

    //添加对应图标
    var prizeImg = new Image();
    prizeImg.src = prize.thumb;
    console.log(prize.thumb);

    (function (angle, prize, prizeImg) {
      prizeImg.onload = function() {
        ctx.save();
        ctx.beginPath();
        var translateX = Math.cos(angle + baseAngle / 2) * wheel.textRadius + canvasW * 0.5;
        var translateY = Math.sin(angle + baseAngle / 2) * wheel.textRadius + canvasH * 0.5;
        ctx.translate(translateX, translateY);
        // rotate 方法旋转当前的绘图，因为文字是和当前扇形中心线垂直的！
        // angle，当前扇形自身旋转的角度 +  baseAngle / 2 中心线多旋转的角度  + 垂直的角度90°
        // 顺时针，弧度制
        var rotateAngle = angle + baseAngle / 2 + Math.PI / 2;
        console.log(angle, translateX, translateY, rotateAngle);
        ctx.rotate(rotateAngle);

        ctx.drawImage(prizeImg, -15, 30);
        ctx.restore();
      };
    })(angle, prize, prizeImg);

    // ctx.drawImage(prizeImg, -15, 30);
    // var imgSorry = new Image();
    // imgSorry.src = "img/2.png";
    // if (rewardName.indexOf("Q币") > 0) {
    //   // 注意，这里要等到img加载完成才能绘制
    //   imgQb.onload = function() {
    //     // ctx.drawImage(imgQb, -15, 30);
    //   };
    //   ctx.drawImage(imgQb, -15, 30);
    // } else if (rewardName.indexOf("谢谢参与") >= 0) {
    //   imgSorry.onload = function() {
    //     // ctx.drawImage(imgSorry, -15, 30);
    //   };
    //   ctx.drawImage(imgSorry, -15, 30);
    // }

    // var imgSorry = new Image();
    // imgSorry.src = "img/2.png";
    // imgSorry.onload = function() {
    //   ctx.drawImage(imgSorry, -15, 30);
    // };
    // ctx.drawImage(imgSorry, -15, 30);

    //还原画板的状态到上一个save()状态之前
    ctx.restore();
    // ctx.restore();
  } // end for loop
}

/**
 * 判断是不是移动设备
 * @type {Object}
 */
var isMobile = {
  Android: function() {
    return navigator.userAgent.match(/Android/i) ? true : false;
  },
  BlackBerry: function() {
    return navigator.userAgent.match(/BlackBerry/i) ? true : false;
  },
  iOS: function() {
    return navigator.userAgent.match(/iPhone|iPad|iPod/i) ? true : false;
  },
  Windows: function() {
    return navigator.userAgent.match(/IEMobile/i) ? true : false;
  },
  any: function() {
    return (this.Android() || this.BlackBerry() || this.iOS() || this.Windows());
  }
};

function writeText() {
  var prizes = null;
  if (rewardName.indexOf("M") > 0) { //查询是否包含字段 流量包
    prizes = rewardName.split("M");
    for (let j = 0; j < prizes.length; j++) {
      ctx.font = (j === 0) ? 'bold 20px Microsoft YaHei' : '16px Microsoft YaHei';
      if (j === 0) {
        ctx.fillText(prizes[j] + "M", -ctx.measureText(prizes[j] + "M").width / 2, j * line_height);
      } else {
        ctx.fillText(prizes[j], -ctx.measureText(prizes[j]).width / 2, j * line_height);
      }
    }
  } else if (rewardName.indexOf("M") == -1 && rewardName.length > 6) { //奖品名称长度超过一定范围
    rewardName = rewardName.substring(0, 6) + "||" + rewardName.substring(6);
    prizes = rewardName.split("||");
    for (let j = 0; j < prizes.length; j++) {
      ctx.fillText(prizes[j], -ctx.measureText(prizes[j]).width / 2, j * line_height);
    }
  } else {
    //在画布上绘制填色的文本。文本的默认颜色是黑色
    ctx.fillText(rewardName, -ctx.measureText(rewardName).width / 2, 0);
  }
}
