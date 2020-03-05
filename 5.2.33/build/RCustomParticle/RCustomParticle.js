var __reflect = (this && this.__reflect) || function (p, c, t) {
    p.__class__ = c, t ? t.push(c) : t = [c], p.__types__ = p.__types__ ? t.concat(p.__types__) : t;
};
var __extends = this && this.__extends || function __extends(t, e) { 
 function r() { 
 this.constructor = t;
}
for (var i in e) e.hasOwnProperty(i) && (t[i] = e[i]);
r.prototype = e.prototype, t.prototype = new r();
};
var RCustom;
(function (RCustom) {
    // 2019/08/25 Note:
    // egret的粒子系統採用 DisplayObject 此Class 只有一個純顯示對象，就類似是顯示一張圖片
    // 但是不可能，因為粒子系統是採用多個粒子
    // 所以推斷 egret粒子系統，採用 根據時間點做 x y 等等顯示物件的屬性位置等計算，並將之存放於 egret.Matrix (此Class為專門計算位置等物件屬性的轉換參數空間) 內
    // 1. 顯示的texure置入 this.$renderNode.addNode(Node[i]) 內 
    // 2. Node[i].matrix = 當前粒子的 x y alpha .... 等顯示物件的基本參數 組成的一個matrix
    // 優點：粒子系統本身是 DisplayObject 而不是 DisplayObjectContainer ，兩者不乾淨程度差異很多，一個是顯示物件，一個是具有容器功能的顯示物件
    // 優點：粒子本身 不具有顯示功能，只具有計算這個粒子於這個時間點應該楚瑜哪個位置，等等純數學計算，非常之乾淨，
    // 優點：此方法執行的效能，是超級超級乾淨的，是可以看著看著就笑起來的程式碼，但是無法得知 GIF 是否能接受
    // 缺點：難移植，一切都是依靠 $renderNode 和 matrix ，無法得知其他遊戲引擎是否具有類似數據
    // 缺點：需要一定程度的Codeing能力，還要經過大量測試
    // 現階段，因為美術追殺的很緊迫，沒有時間實現以上功能，所以當前是
    // 粒子系統本身是 顯示容器，粒子本身 是 純顯示物件
    // 優點：容易移植，撰寫時間不需要很久，容易移植其他遊戲引擎
    // 缺點：效能無法最佳化
    var ParticeSystem = (function (_super) {
        __extends(ParticeSystem, _super);
        // ----------------------------------------------------
        function ParticeSystem() {
            var _this = _super.call(this) || this;
            _this.LastStartTime = 0; // 紀錄上次的噴發時間點
            _this.FreamTime = 0; // 紀錄這一次要噴發多少時間
            _this.numParticles = 0; // 當前使用中的粒子數量
            _this.pool = []; // 存放非運作中的粒子
            _this.particles = []; // 存放  運作中的粒子
            _this.ScaleAdjust_Weights = []; // 放大縮小曲線 的 權重表
            _this.ScaleAdjust_Values = []; // 放大縮小曲線 的 數值表
            _this.totalTime = 0; // 粒子系統的總噴發時間
            _this.timeMul = 1; // 粒子系統的加速倍率
            _this.IsSendTimeEvent = false; // 是否要檢查事件觸發機制
            _this.lstEventTime = []; // 觸發事件的時間
            _this.lstEventName = []; // 觸發事件的名稱
            _this.touchEnabled = false;
            _this.touchChildren = false;
            _this.visible = false;
            _this.display = new egret.DisplayObjectContainer();
            _this.display.touchEnabled = false;
            _this.display.touchChildren = false;
            _this.addChild(_this.display);
            return _this;
        }
        ParticeSystem.prototype.Test = function () {
            console.log("..............................................");
        };
        /** 讓使用者 */
        ParticeSystem.prototype.initConfig = function (tempConfig) {
            this.Test();
            var _Config = this.ConversionJson(tempConfig);
            this.Config = _Config;
            // -------------- 粒子系統 --------------
            this.emissionRate = _Config.ParticeSystemEmissionRate;
            this.timeMul = _Config.ParticeSystemPlayTimeMul;
            this.totalTime = _Config.ParticeSystemPlayTime;
            this.x = _Config.ParticeSystemLocation_X;
            this.y = _Config.ParticeSystemLocation_Y;
            // -------------- 粒子參數需要再System決定的 --------------
            this.emitterX = _Config.ParticeEmitter_X; // 噴發位置偏差數據
            this.emitterY = _Config.ParticeEmitter_Y;
            // -------------- 粒子路徑設定的 --------------
            this.Path_Mode = _Config.ParticleIsSystemPathMode;
            if (_Config.ParticleIsSystemPathMode == true) {
                this.Path_Cycle = _Config.ParticlePathCycle;
                this.Path_Speed = _Config.ParticlePathSpeed;
                var ConfigPathData = _Config.ParticlePathWaypoints;
                var Len = ConfigPathData.length;
                var _Path_Waypoints = [];
                for (var i = 0; i < Len; i++) {
                    var Waypoints = new RCustom.ParticlePoint();
                    Waypoints.x = ConfigPathData[i][0];
                    Waypoints.y = ConfigPathData[i][1];
                    _Path_Waypoints[i] = Waypoints;
                }
                this.Path_Waypoints = _Path_Waypoints;
            }
            // -------------- 數據計算 --------------
            this.ScaleAdjust_Weights = RCustom.ParticleMath.getDistribution_Weights(_Config.ParticeScaleAdjust_SD, _Config.ParticeScaleAdjust_Size);
            this.ScaleAdjust_Values = RCustom.ParticleMath.getDistribution_Values(_Config.ParticeScaleAdjust_Min, _Config.ParticeScaleAdjust_Max, this.ScaleAdjust_Weights);
            // -------------- MovieClip獲取資料 --------------
            var data = RES.getRes(_Config.ParticeSystemMovieClipData + "_json");
            var texture = RES.getRes(_Config.ParticeSystemMovieClipData + "_png");
            var _mcFactory = new egret.MovieClipDataFactory(data, texture);
            var _pool = [];
            var Rate = this.emissionRate * 3; // 先建立會用到的粒子，根據經驗 * 3 的數量為必定會使用到，還不如提前創建好
            var _display = this.display;
            for (var i = 0; i < Rate; i++) {
                var cmpParticle = new RCustom.Particle();
                cmpParticle.mInit(_mcFactory.generateMovieClipData(), _display); // 初始化
                if (true)
                    cmpParticle.ID = i;
                _pool.push(cmpParticle); // 塞入等待被使用的池內
            }
            if (true)
                this.ParticeID = i;
            this.pool = _pool;
            this.mcFactory = _mcFactory;
        };
        ParticeSystem.prototype.ConversionJson = function (_Config) {
            var tempConfig = new RCustom.ParticleSetting();
            tempConfig.setConfig(_Config);
            return tempConfig;
        };
        /** 開始粒子表演
         * @param duration 粒子系統噴發的時間，-1代表重複撥放    */
        ParticeSystem.prototype.start = function (duration) {
            if (duration === void 0) { duration = this.Config.ParticeSystemPlayTime; }
            if (this.Config == null)
                throw Error("Config Data is null. please init first");
            this.stop(); // 先停止
            this.visible = true; // 播放的話就讓他顯示
            if (true)
                if (this.Config.ParticeIsAutoFixVisible == true)
                    ParticeSystem.MaxDisplayTime = 0;
            this.totalTime = duration; // 紀錄時間
            this.NowPlayTime = 0;
            egret.startTick(this.countTime, this); // 開始計時執行
            this.timeStamp = egret.getTimer(); // 紀錄當前開始的時間
            dEventSystem.on_event("start", this.timeStamp);
            if (this.Path_Mode == true)
                this.preProcessPath(); // 設定曲線
            this.IsSendTimeEvent = this.Config.ParticleIsEventType;
            if (this.IsSendTimeEvent == true) {
                this.lstEventTime = this.Config.ParticleEventTime;
                this.lstEventName = this.Config.ParticleEventName;
            }
            this.FreamTime = 0;
            this.LastStartTime = egret.getTimer();
            this.IntervalCode = egret.setInterval(this.update, this, 1000 / this.emissionRate); // 設定Tick
        };
        ParticeSystem.prototype.countTime = function (timeStamp) {
            var dt = timeStamp - this.timeStamp; // 紀錄時間差
            this.timeStamp = timeStamp; // 儲存新的時間
            dEventSystem.on_event("countTime", timeStamp);
            this.NowPlayTime += dt; // 累加時間
            // ---------- 修改噴發時間 ----------
            if (this.totalTime != -1) {
                this.totalTime -= dt; // 減少時間
                if (this.totalTime < 0)
                    this.totalTime = 0;
            }
            // ---------- 更新粒子時間 ----------
            var particle;
            var particleIndex = 0;
            var _particles = this.particles;
            var newDt = dt * this.timeMul;
            while (particleIndex < this.numParticles) {
                particle = _particles[particleIndex]; // 獲取粒子
                if (particle.currentTime < particle.totalTime) {
                    particle.mUpdate(newDt); // 更新Frame系列行為
                    particle.currentTime += newDt; // 累加時間
                    particleIndex++; // 進行下一個粒子判斷
                }
                else
                    this.removeParticle(particle); // 移除粒子到物件池內
            }
            // ---------- 檢查事件時間點 ----------
            if (this.IsSendTimeEvent == true) {
                var Len = this.lstEventTime.length;
                var _lstEventName = this.lstEventName;
                var _lstEventTime = this.lstEventTime;
                var NowTime = this.NowPlayTime;
                for (var i = 0; i < Len; i++) {
                    var CheckTime = _lstEventTime[i];
                    if (CheckTime < NowTime) {
                        dEventSystem.on_event("eventName", this, _lstEventName[i]);
                        _lstEventTime.splice(i, 1);
                        _lstEventName.splice(i, 1);
                    }
                }
                if (Len == 0)
                    this.IsSendTimeEvent = false;
            }
            if (this.totalTime == 0) {
                egret.clearInterval(this.IntervalCode);
                //dEventSystem.on_event("stop", this);
            }
            if (this.numParticles == 0 && this.totalTime == 0) {
                this.visible = false;
                egret.stopTick(this.countTime, this); // 時間到的話，就移除
                dEventSystem.on_event("done");
                if (true)
                    if (this.Config.ParticeIsAutoFixVisible == true)
                        console.log("當前設定的SaveTime 有效能問題，粒子在第" + ParticeSystem.MaxDisplayTime + " 豪秒，就不在畫面上了");
            }
            return false;
        };
        /** 粒子系統的Frame行為
        * @param timeStamp 系統給的時間標籤 */
        ParticeSystem.prototype.update = function () {
            var now = egret.getTimer();
            var RateTime = 1000 / this.emissionRate;
            var dt = now - this.LastStartTime;
            this.LastStartTime = now;
            if (this.totalTime == -1 || this.totalTime > 0) {
                this.offsetTime = 0;
                this.FreamTime += dt;
                while (this.FreamTime > 0) {
                    this.addOneParticle(); // 產出粒子
                    this.FreamTime -= RateTime;
                }
            }
            return false;
        };
        /** 停止粒子
         * @param clear 是否清除掉现有粒子 */
        ParticeSystem.prototype.stop = function (clear) {
            if (clear === void 0) { clear = false; }
            egret.clearInterval(this.IntervalCode);
            if (clear == true) {
                this.visible = false;
                this.clear();
                egret.stopTick(this.countTime, this);
            }
        };
        /** 獲取一個粒子，並進行激活動作*/
        ParticeSystem.prototype.addOneParticle = function () {
            //todo 这里可能需要返回成功与否
            var cmpParticle = this.getParticle();
            if (this.Path_Mode == false)
                cmpParticle.mStart(this.Config, this.getStartPostition(), this.ScaleAdjust_Weights, this.ScaleAdjust_Values);
            else {
                cmpParticle.mStart(this.Config, this.getNextPathPosition(this.offsetTime), this.ScaleAdjust_Weights, this.ScaleAdjust_Values);
                this.offsetTime += 1000 / this.emissionRate;
            }
            this.particles.push(cmpParticle);
            this.numParticles++;
        };
        /** 獲取一個沒再使用的粒子 */
        ParticeSystem.prototype.getParticle = function () {
            var result;
            if (this.pool.length > 0)
                result = this.pool.pop(); // 從池子裏面拿出物件，凡是在池子裡面的都是沒有被使用到的物件
            else {
                result = new RCustom.Particle();
                result.mInit(this.mcFactory.generateMovieClipData(), this.display);
                if (true)
                    result.ID = ++this.ParticeID;
            }
            return result;
        };
        /** 獲取噴發位置 */
        ParticeSystem.prototype.getStartPostition = function () {
            var offsetX = this.emitterX;
            var offsetY = this.emitterY;
            var PPoint = {
                x: RCustom.ParticleMath.getRandom(-offsetX, offsetX),
                y: RCustom.ParticleMath.getRandom(-offsetY, offsetY)
            };
            return PPoint;
        };
        /** 刪除某個粒子，其實也不是刪除，只是把他丟到池子 */
        ParticeSystem.prototype.removeParticle = function (particle) {
            var index = this.particles.indexOf(particle); // 如果該粒子存在總控制攔的話
            if (index != -1) {
                particle.mStop(); // 先暫停這個粒子
                this.particles.splice(index, 1); // 移除這個粒子於總控制區域
                this.pool.push(particle); // 丟入等待被使用的池子
                this.numParticles--; // 減少當前使用的Count
            }
        };
        /** 清除所有粒子 */
        ParticeSystem.prototype.clear = function () {
            var _particles = this.particles;
            var _Len = _particles.length;
            for (var i = 0; i < _Len; i++)
                this.removeParticle(_particles[0]);
            this.numParticles = 0;
        };
        // -------------------------- 曲線函數 --------------------------
        /** 初始化路径 */
        ParticeSystem.prototype.preProcessPath = function () {
            var Waypoints = this.Path_Waypoints;
            var lastWp = Waypoints[0]; // 先設定第一個當作判斷用的變數
            var totalDistance = 0; // 初始化，用於計算距離
            var _Len = Waypoints.length;
            for (var i = 1; i < _Len; i++) {
                var nextWp = Waypoints[i];
                nextWp.index = i;
                nextWp.spanDistance = this.calcnDistance(lastWp, nextWp);
                totalDistance += nextWp.spanDistance; // 累加距離
                nextWp.totalDistance = totalDistance; // 更新累加後的距離
                lastWp = nextWp; // 進行下一個點位判斷
            }
            var firstWp = Waypoints[0];
            var lastSpan = this.calcnDistance(firstWp, Waypoints[_Len - 1]); // 獲取最後的距離
            totalDistance += lastSpan;
            this.TotalPathDistance = totalDistance;
            firstWp.index = 0;
            firstWp.totalDistance = totalDistance;
            firstWp.spanDistance = lastSpan;
        };
        ;
        /** 計算距離，使用畢氏定理去計算 */
        ParticeSystem.prototype.calcnDistance = function (P1, P2) {
            var xd = P1.x - P2.x;
            var yd = P1.y - P2.y;
            return Math.sqrt(xd * xd + yd * yd); // 使用畢氏定理獲取距離
        };
        /** 根據當前時間，判斷要獲取的點位在哪 */
        ParticeSystem.prototype.getNextPathPosition = function (msOffset) {
            var Waypoints = this.Path_Waypoints;
            var _Len = Waypoints.length;
            var elapsed = this.NowPlayTime + msOffset;
            var targetDistance = elapsed * this.Path_Speed * 20;
            if (this.Path_Cycle == false)
                if (targetDistance > Waypoints[_Len - 1].totalDistance - 10)
                    egret.clearInterval(this.IntervalCode);
            targetDistance = this.normalize(targetDistance, this.TotalPathDistance);
            var startLoop = _Len - 1;
            for (var i = startLoop; i >= 1; i--)
                if (targetDistance > Waypoints[i].totalDistance)
                    break;
            var lastWp = Waypoints[i];
            if (++i >= _Len)
                i = 0;
            var nextWp = Waypoints[i];
            var t = 1 - ((nextWp.totalDistance - targetDistance) / nextWp.spanDistance);
            var p = {
                x: lastWp.x + ((nextWp.x - lastWp.x) * t),
                y: lastWp.y + ((nextWp.y - lastWp.y) * t)
            };
            return p;
        };
        /** 進行適配性的操作 */
        ParticeSystem.prototype.normalize = function (value, fit) {
            if (value < 0) {
                while (value < 0) {
                    value += fit;
                }
            }
            else if (value > fit) {
                while (value > fit) {
                    value -= fit;
                }
            }
            return value;
        };
        // -------------------------------------------------------
        ParticeSystem.prototype.setEmissionRate = function (value) {
            this.stop(true);
            this.Config.ParticeSystemEmissionRate = value;
            this.emissionRate = value;
            this.start();
        };
        ParticeSystem.prototype.setPlayTime = function (value) {
            this.stop(true);
            this.Config.ParticeSystemPlayTime = value * 1000;
            this.totalTime = value * 1000;
            this.start();
        };
        ParticeSystem.prototype.setPlayTimeMul = function (value) {
            this.stop(true);
            this.Config.ParticeSystemPlayTimeMul = value / 100;
            this.timeMul = value / 100;
            this.start();
        };
        ParticeSystem.prototype.setLocation_X = function (value) {
            this.stop(true);
            var temp_x = (IsVertical) ? 360 : 640;
            this.Config.ParticeSystemLocation_X = value + temp_x;
            this.x = value + temp_x;
            this.start();
        };
        ParticeSystem.prototype.setLocation_Y = function (value) {
            this.stop(true);
            var temp_y = (IsVertical) ? 640 : 360;
            this.Config.ParticeSystemLocation_Y = value + temp_y;
            this.y = value + temp_y;
            this.start();
        };
        ParticeSystem.prototype.setEmitter_X = function (value) {
            this.stop(true);
            this.Config.ParticeEmitter_X = value;
            this.emitterX = value;
            this.start();
        };
        ParticeSystem.prototype.setEmitter_Y = function (value) {
            this.stop(true);
            this.Config.ParticeEmitter_Y = value;
            this.emitterY = value;
            this.start();
        };
        ParticeSystem.prototype.setGravity_X = function (value) {
            this.stop(true);
            this.Config.ParticeGravity_X = value / 1000;
            this.start();
        };
        ParticeSystem.prototype.setGravity_Y = function (value) {
            this.stop(true);
            this.Config.ParticeGravity_Y = value / 1000;
            this.start();
        };
        ParticeSystem.prototype.setSaveTime_Min = function (value) {
            this.stop(true);
            this.Config.ParticeSaveTime_Min = value * 1000;
            this.start();
        };
        ParticeSystem.prototype.setSaveTime_Max = function (value) {
            this.stop(true);
            this.Config.ParticeSaveTime_Max = value * 1000;
            this.start();
        };
        ParticeSystem.prototype.setBleanModeType = function (value) {
            this.stop(true);
            this.Config.ParticeBleanModeType = value;
            this.start();
        };
        ParticeSystem.prototype.setIsRandomFrame = function (value) {
            this.stop(true);
            this.Config.ParticeIsRandomFrame = value;
            this.start();
        };
        ParticeSystem.prototype.setFireSpeed_Min = function (value) {
            this.stop(true);
            this.Config.ParticeFireSpeed_Min = value / 100;
            this.start();
        };
        ParticeSystem.prototype.setFireSpeed_Max = function (value) {
            this.stop(true);
            this.Config.ParticeFireSpeed_Max = value / 100;
            this.start();
        };
        ParticeSystem.prototype.setDrag = function (value) {
            this.stop(true);
            this.Config.ParticeDrag = value / 1000000;
            this.start();
        };
        ParticeSystem.prototype.setDirection_Min = function (value) {
            this.stop(true);
            this.Config.ParticeDirection_Min = value;
            this.start();
        };
        ParticeSystem.prototype.setDirection_Max = function (value) {
            this.stop(true);
            this.Config.ParticeDirection_Max = value;
            this.start();
        };
        ParticeSystem.prototype.setScale_Min = function (value) {
            this.stop(true);
            this.Config.ParticeScale_Min = value / 100;
            this.start();
        };
        ParticeSystem.prototype.setScale_Max = function (value) {
            this.stop(true);
            this.Config.ParticeScale_Max = value / 100;
            this.start();
        };
        ParticeSystem.prototype.setScaleAdjust_Min = function (value) {
            this.stop(true);
            this.Config.ParticeScaleAdjust_Min = value / 100;
            this.ScaleAdjust_Values = RCustom.ParticleMath.getDistribution_Values(value / 100, this.Config.ParticeScaleAdjust_Max, this.ScaleAdjust_Weights);
            this.start();
        };
        ParticeSystem.prototype.setScaleAdjust_Max = function (value) {
            this.stop(true);
            this.Config.ParticeScaleAdjust_Max = value / 100;
            this.ScaleAdjust_Values = RCustom.ParticleMath.getDistribution_Values(this.Config.ParticeScaleAdjust_Min, value / 100, this.ScaleAdjust_Weights);
            this.start();
        };
        ParticeSystem.prototype.setScaleAdjust_Size = function (value) {
            this.stop(true);
            this.Config.ParticeScaleAdjust_Size = value;
            this.ScaleAdjust_Weights = RCustom.ParticleMath.getDistribution_Weights(this.Config.ParticeScaleAdjust_SD, value);
            this.ScaleAdjust_Values = RCustom.ParticleMath.getDistribution_Values(this.Config.ParticeScaleAdjust_Min, this.Config.ParticeScaleAdjust_Max, this.ScaleAdjust_Weights);
            this.start();
        };
        ParticeSystem.prototype.setScaleAdjust_SD = function (value) {
            this.stop(true);
            this.Config.ParticeScaleAdjust_SD = value;
            this.ScaleAdjust_Weights = RCustom.ParticleMath.getDistribution_Weights(value, this.Config.ParticeScaleAdjust_Size);
            this.ScaleAdjust_Values = RCustom.ParticleMath.getDistribution_Values(this.Config.ParticeScaleAdjust_Min, this.Config.ParticeScaleAdjust_Max, this.ScaleAdjust_Weights);
            this.start();
        };
        ParticeSystem.prototype.setRotation_Min = function (value) {
            this.stop(true);
            this.Config.ParticleRotation_Min = value;
            this.start();
        };
        ParticeSystem.prototype.setRotation_Max = function (value) {
            this.stop(true);
            this.Config.ParticleRotation_Max = value;
            this.start();
        };
        ParticeSystem.prototype.setRotationSpeed_Min = function (value) {
            this.stop(true);
            this.Config.ParticleRotationSpeed_Min = value;
            this.start();
        };
        ParticeSystem.prototype.setRotationSpeed_Max = function (value) {
            this.stop(true);
            this.Config.ParticleRotationSpeed_Max = value;
            this.start();
        };
        ParticeSystem.prototype.setStartAlpha_Min = function (value) {
            this.stop(true);
            this.Config.ParticleStartAlpha_Min = value / 100;
            this.start();
        };
        ParticeSystem.prototype.setStartAlpha_Max = function (value) {
            this.stop(true);
            this.Config.ParticleStartAlpha_Max = value / 100;
            this.start();
        };
        ParticeSystem.prototype.setEndAlpha_Min = function (value) {
            this.stop(true);
            this.Config.ParticleEndAlpha_Min = value / 100;
            this.start();
        };
        ParticeSystem.prototype.setEndAlpha_Max = function (value) {
            this.stop(true);
            this.Config.ParticleEndAlpha_Max = value / 100;
            this.start();
        };
        ParticeSystem.prototype.setIsSystemPathMode = function (value) {
            this.stop(true);
            this.Path_Mode = value;
            if (value) {
                this.Path_Cycle = this.Config.ParticlePathCycle;
                this.Path_Speed = this.Config.ParticlePathSpeed;
                var ConfigPathData = this.Config.ParticlePathWaypoints;
                var Len = ConfigPathData.length;
                var _Path_Waypoints = [];
                for (var i = 0; i < Len; i++) {
                    var Waypoints = new RCustom.ParticlePoint();
                    Waypoints.x = ConfigPathData[i][0];
                    Waypoints.y = ConfigPathData[i][1];
                    _Path_Waypoints[i] = Waypoints;
                }
                this.Path_Waypoints = _Path_Waypoints;
            }
            this.start();
        };
        ParticeSystem.prototype.setPathCycle = function (value) {
            this.stop(true);
            this.Path_Cycle = value;
            this.start();
        };
        ParticeSystem.prototype.setPathSpeed = function (value) {
            this.stop(true);
            this.Path_Speed = value;
            this.start();
        };
        ParticeSystem.prototype.setPathWaypoints_Add = function (x, y) {
            this.stop(true);
            var Waypoints = new RCustom.ParticlePoint();
            Waypoints.x = x;
            Waypoints.y = y;
            this.Path_Waypoints.push(Waypoints);
            this.start();
        };
        ParticeSystem.prototype.setPathWaypoints_Edit = function (x, y, EditLocation) {
            this.stop(true);
            this.Path_Waypoints[EditLocation].x = x;
            this.Path_Waypoints[EditLocation].y = y;
            this.start();
        };
        ParticeSystem.prototype.setPathWaypoints_Remove = function (value) {
            this.stop(true);
            var t = new Array(); // 路徑點位
            for (var i = 0; i < this.Path_Waypoints.length; i++) {
                if (i == value)
                    continue;
                t.push(this.Path_Waypoints[i]);
            }
            this.Path_Waypoints = t;
            this.start();
        };
        return ParticeSystem;
    }(egret.DisplayObjectContainer));
    RCustom.ParticeSystem = ParticeSystem;
    __reflect(ParticeSystem.prototype, "RCustom.ParticeSystem");
})(RCustom || (RCustom = {}));
var RCustom;
(function (RCustom) {
    var Particle = (function (_super) {
        __extends(Particle, _super);
        // ----------------- 數據 -----------------
        function Particle() {
            var _this = _super.call(this) || this;
            _this.totalTime = 0; // 該粒子的存活時間
            _this.currentTime = 0; // 該粒子的當前時間
            _this.NowGravity_X = 0;
            _this.NowGravity_Y = 0;
            _this.touchEnabled = false;
            return _this;
        }
        Particle.prototype.mInit = function (_movieClipData, _parentStage) {
            if (this.parent != _parentStage) {
                this.parentStage = _parentStage;
                _parentStage.addChild(this);
            }
            if (this.movieClipData != _movieClipData) {
                this.movieClipData = _movieClipData;
                this.anchorOffsetX = this.width / 2;
                this.anchorOffsetY = this.height / 2;
            }
            this.visible = false;
        };
        Particle.prototype.mStart = function (_Config, LocationPoint, ScaleAdjust_Weights, ScaleAdjust_Values) {
            var self = this;
            // ------------- 初始化 -------------
            self.currentTime = 0;
            self.NowGravity_X = 0;
            self.NowGravity_Y = 0;
            self.visible = true;
            self.x = LocationPoint.x;
            self.y = LocationPoint.y;
            // ------------- 判斷Config是否要重新設定 -------------
            self.Config = _Config;
            self.blendMode = _Config.ParticeBleanModeType;
            if (_Config.ParticeIsRandomFrame == true) {
                var ranValue = Math.floor(Math.random() * self.$totalFrames);
                self.gotoAndPlay(ranValue, -1); // 隨機播放GIF的任一Frame開始旋轉
            }
            else
                self.play(-1);
            self.Gravity_X = _Config.ParticeGravity_X;
            self.Gravity_Y = _Config.ParticeGravity_Y;
            self.Drag = _Config.ParticeDrag;
            // ------------- 更新亂數 -------------
            self.totalTime = RCustom.ParticleMath.getRandom(_Config.ParticeSaveTime_Min, _Config.ParticeSaveTime_Max);
            var Dir = RCustom.ParticleMath.getRandom(_Config.ParticeDirection_Min, _Config.ParticeDirection_Max);
            self.velocityX = Math.sin(Math.PI / 180 * Dir);
            self.velocityY = -Math.cos(Math.PI / 180 * Dir);
            self.velocity = RCustom.ParticleMath.getRandom(_Config.ParticeFireSpeed_Min, _Config.ParticeFireSpeed_Max);
            self.scaleX = self.scaleY = RCustom.ParticleMath.getRandom(_Config.ParticeScale_Min, _Config.ParticeScale_Max);
            self.ScaleAdjust = RCustom.ParticleMath.getWeightsValue(ScaleAdjust_Weights, ScaleAdjust_Values);
            self.alpha = RCustom.ParticleMath.getRandom(_Config.ParticleStartAlpha_Min, _Config.ParticleStartAlpha_Max);
            self.EndAlpha = RCustom.ParticleMath.getRandom(_Config.ParticleEndAlpha_Min, _Config.ParticleEndAlpha_Max);
            self.AlphaDelta = (self.EndAlpha - self.alpha) / self.totalTime;
            self.rotation = RCustom.ParticleMath.getRandom(_Config.ParticleRotation_Min, _Config.ParticleRotation_Max);
            self.RotationSpeed = RCustom.ParticleMath.getRandom(_Config.ParticleRotationSpeed_Min, _Config.ParticleRotationSpeed_Max);
        };
        Particle.prototype.mUpdate = function (delta) {
            var self = this;
            self.x += self.velocityX * self.velocity * delta;
            self.y += self.velocityY * self.velocity * delta;
            self.NowGravity_X += self.Gravity_X * delta;
            self.NowGravity_Y += self.Gravity_Y * delta;
            self.x += self.NowGravity_X * delta;
            self.y += self.NowGravity_Y * delta;
            self.scaleX *= self.ScaleAdjust;
            self.scaleY *= self.ScaleAdjust;
            self.alpha += self.AlphaDelta * delta;
            self.rotation += self.RotationSpeed * delta;
            if (self.velocity > 0)
                self.velocity -= self.Drag * delta;
            if (true)
                if (self.Config.ParticeIsAutoFixVisible == true)
                    self.checkVisible();
            if (self.scaleX < 0.05) {
                self.mStop();
                return;
            }
        };
        Particle.prototype.mStop = function () {
            if (true)
                if (this.visible == false)
                    if (this.Config.ParticeIsAutoFixVisible == true)
                        RCustom.ParticeSystem.MaxDisplayTime = Math.max(this.DebugVisbleTime, RCustom.ParticeSystem.MaxDisplayTime);
            this.visible = false;
        };
        Particle.prototype.checkVisible = function () {
            if (true) {
                var location = this.localToGlobal(); // 獲取全域位置
                var isIn_X = (location.x + this.width > 0) && (location.x - this.width < 720);
                var visibleResult = false;
                if (isIn_X == true) {
                    var isIn_Y = (location.y + this.height > 0) && (location.y - this.height < 1280);
                    visibleResult = isIn_Y;
                }
                if (visibleResult == false && this.visible == true)
                    this.DebugVisbleTime = this.currentTime;
                this.visible = visibleResult;
            }
        };
        return Particle;
    }(egret.MovieClip));
    RCustom.Particle = Particle;
    __reflect(Particle.prototype, "RCustom.Particle");
})(RCustom || (RCustom = {}));
var RCustom;
(function (RCustom) {
    var ParticleMath = (function () {
        function ParticleMath() {
        }
        /** 獲取隨機數
         * @param min 獲取最小數值
         * @param max 獲取最大數值 */
        ParticleMath.getRandom = function (min, max) {
            return Math.random() * (max - min) + min;
        };
        /** 實現常態分布標準差的權重表
         * @param SD 偏差值
         * @param Size 你想設定的權重Size    */
        ParticleMath.getDistribution_Weights = function (SD, WeightsSize) {
            var Weights = [];
            if (SD == 0) {
                Weights.push(50);
                return Weights;
            }
            var HalfSize = WeightsSize / 2; // 等於 10 
            var SDPart = SD / HalfSize;
            var StartSize = HalfSize - 1;
            for (var i = 0; i < StartSize; i++) {
                var PartMul = HalfSize - i;
                var MulValue = SDPart * PartMul;
                Weights.push(50 - MulValue);
            }
            Weights.push(50);
            var EndSize = WeightsSize - 1;
            for (var i = HalfSize; i < EndSize; i++) {
                var PartMul = i - HalfSize + 1;
                var MulValue = SDPart * PartMul;
                Weights.push(50 + MulValue);
            }
            /* var Size: number = Weights.length;
             for (var i = 0; i < Size; i++)
                 console.log("[粒子] [權重測試] " + " 第 " + i + " 個  = " + Weights[i]);*/
            return Weights;
        };
        /** 實現常態分布標準差的數值表
         * @param min 獲取最小數值
         * @param max 獲取最大數值
         * @param ValueSize 設定的長度為多少         */
        ParticleMath.getDistribution_Values = function (min, max, WeightsSize) {
            var Dif = max - min;
            var ValueSize = WeightsSize.length;
            var SinglePart = Dif / ValueSize;
            var aryValue = [];
            for (var i = 0; i < ValueSize; i++)
                aryValue.push(min + i * SinglePart);
            /* var Size: number = aryValue.length;
            for (var i = 0; i < Size; i++)
                console.log("[粒子] [數值測試] " + " 第 " + i + " 個  = " + aryValue[i]); */
            return aryValue;
        };
        /** 根據各設定的權重的機率去獲取對應的數值
         * @param Weights 權重表
         * @param Values 數值表  */
        ParticleMath.getWeightsValue = function (Weights, Values) {
            var Size = Weights.length;
            var Sum = 0;
            for (var i = 0; i < Size; i++)
                Sum += Weights[i];
            var HitSumValue = this.getRandom(0, Sum);
            Sum = 0;
            for (var i = 0; i < Size; i++) {
                Sum += Weights[i];
                if (HitSumValue < Sum)
                    return Values[i];
            }
            return Values[i - 1];
        };
        return ParticleMath;
    }());
    RCustom.ParticleMath = ParticleMath;
    __reflect(ParticleMath.prototype, "RCustom.ParticleMath");
})(RCustom || (RCustom = {}));
var RCustom;
(function (RCustom) {
    var ParticlePoint = (function () {
        function ParticlePoint() {
        }
        return ParticlePoint;
    }());
    RCustom.ParticlePoint = ParticlePoint;
    __reflect(ParticlePoint.prototype, "RCustom.ParticlePoint");
})(RCustom || (RCustom = {}));
var RCustom;
(function (RCustom) {
    var ParticleSetting = (function () {
        function ParticleSetting() {
            this.ParticeSystemMovieClipData = "null"; // 使用的素材
            this.ParticeSystemEmissionRate = -1; // 粒子噴發的數量
            this.ParticeSystemPlayTime = -1; // 粒子的噴發時間
            this.ParticeSystemPlayTimeMul = -1; // 粒子的噴發時間倍率影響
            this.ParticeSystemLocation_X = -1; // 粒子系統的位置
            this.ParticeSystemLocation_Y = -1; // 粒子系統的位置
            this.ParticeBleanModeType = ""; // 粒子系統的混合模式
            this.ParticeIsRandomFrame = false; // 是否開始粒子隨機Frame功能
            this.ParticeIsAutoFixVisible = false; // 是否開啟檢查機制，用於判斷當粒子於畫面外的時候不進行渲染
            this.ParticeEmitter_X = -1; // 粒子系統的噴發偏差位置上限
            this.ParticeEmitter_Y = -1; // 粒子系統的噴發偏差位置上限
            this.ParticeGravity_X = -1; // 粒子系統的重力 for 水平軸
            this.ParticeGravity_Y = -1; // 粒子系統的重力 for 垂直軸
            this.ParticeSaveTime_Min = -1; // 粒子的存活時間 下限
            this.ParticeSaveTime_Max = -1; // 粒子的存活時間 上限
            this.ParticeDirection_Min = -1; // 粒子系統的發射方向 下限
            this.ParticeDirection_Max = -1; // 粒子系統的發射方向 上限
            this.ParticeFireSpeed_Min = -1; // 粒子力發射力道的 下限
            this.ParticeFireSpeed_Max = -1; // 粒子力發射力道的 上限
            this.ParticeDrag = -1; // 粒子的回拖
            this.ParticeScale_Min = -1; // 粒子基本大小 的 下限
            this.ParticeScale_Max = -1; // 粒子基本大小 的 上限
            this.ParticeScaleAdjust_Min = -1; // 粒子放大縮小曲線 的 下限
            this.ParticeScaleAdjust_Max = -1; // 粒子放大縮小曲線 的 上限
            this.ParticeScaleAdjust_SD = -1; // 粒子放大縮小曲線 的 偏差值
            this.ParticeScaleAdjust_Size = -1; // 粒子放大縮小曲線 的 樣本數
            this.ParticleRotation_Min = -1; // 粒子的開始旋轉角度 下限
            this.ParticleRotation_Max = -1; // 粒子的開始旋轉角度 上限
            this.ParticleRotationSpeed_Min = -1; // 粒子的旋轉速度 下限
            this.ParticleRotationSpeed_Max = -1; // 粒子的旋轉速度 上限
            this.ParticleStartAlpha_Min = -1; // 粒子開始透明度 下限
            this.ParticleStartAlpha_Max = -1; // 粒子開始透明度 上限
            this.ParticleEndAlpha_Min = -1; // 粒子結束透明度 上限
            this.ParticleEndAlpha_Max = -1; // 粒子結束透明度 上限
            this.ParticleIsSystemPathMode = false; // 是否開啟路線模式
            this.ParticlePathCycle = false; // 是否開始路線Close Loop模式
            this.ParticlePathSpeed = -1; // 路線的速度
            this.ParticlePathWaypoints = []; // 路線的點位
            this.ParticleIsEventType = false; // 是否有事件發生
            this.ParticleEventTime = []; // 事件的時間標籤
            this.ParticleEventName = []; // 事件的事件名稱
        }
        ParticleSetting.prototype.setConfig = function (_Config) {
            for (var key in _Config) {
                var value = _Config[key];
                if (value === null || value === '')
                    continue; // 如果沒有數值 或是 空的 不做
                if ((key in this) == false)
                    continue; // 沒有這個屬性 不做
                if (typeof value === 'number')
                    this[key] = Number(value);
                else
                    this[key] = value;
            }
        };
        return ParticleSetting;
    }());
    RCustom.ParticleSetting = ParticleSetting;
    __reflect(ParticleSetting.prototype, "RCustom.ParticleSetting");
})(RCustom || (RCustom = {}));
