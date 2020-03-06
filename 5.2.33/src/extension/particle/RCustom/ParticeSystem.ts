module RCustom {

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

    export class ParticeSystem extends egret.DisplayObjectContainer {

        public IsVertical: boolean = true;           // 畫面是否為橫版
        private LastStartTime: number = 0;          // 紀錄上次的噴發時間點
        private FreamTime: number = 0;              // 紀錄這一次要噴發多少時間

        public static MaxDisplayTime: number;       // Debug用的變數
        private ParticeID: number;                  // Debug用的 辨別粒子的ID

        private mcFactory: egret.MovieClipDataFactory;  // 粒子需要的GIF素材工廠
        private display: egret.DisplayObjectContainer;  // 顯示容器 未來考慮直接用數學運算式推導哪個位置要有圖片

        private IntervalCode: number;               // 控管粒子出現的間格代號
        private numParticles: number = 0;           // 當前使用中的粒子數量
        private pool: Array<Particle> = [];         // 存放非運作中的粒子
        private particles: Array<Particle> = [];    // 存放  運作中的粒子
        private timeStamp: number;                  // 紀錄上次間隔的時間標籤戳，此粒子系統採用根據時間來更新粒子的位置，而不是根據Freame，此乃推薦做法，避免卡頓

        private Config: ParticleSetting;            // 存放Config檔案
        private ScaleAdjust_Weights = []            // 放大縮小曲線 的 權重表
        private ScaleAdjust_Values = []             // 放大縮小曲線 的 數值表

        private TotalPathDistance: number;          // 路線會用到的累計當前距離
        private NowPlayTime: number;                // 路線會用到的累計當前時間
        private offsetTime: number;                 // 路線會用到的產生粒子的時間判斷變數

        // ------------- 粒子系統需要的數據 -------------
        private emissionRate: number;               // 每秒發射的粒子數量
        private totalTime: number = 0;              // 粒子系統的總噴發時間
        private timeMul: number = 1;                // 粒子系統的加速倍率

        private IsSendTimeEvent: boolean = false;   // 是否要檢查事件觸發機制
        private timeTag: number;                    // 當播放時間到指定的Tag Frame 我就進行通知事件。
        private lstEventTime: Array<number> = [];   // 觸發事件的時間
        private lstEventName: Array<string> = [];   // 觸發事件的名稱

        // ------------- 粒子需要的數據 -------------
        private emitterX: number;                   // 粒子的X軸 上下限位置，如果是 0 就集中噴發
        private emitterY: number;                   // 粒子的Y軸 上下限位置，如果是 0 就集中噴發

        private Path_Mode: boolean;                 // 是否為路徑模式
        private Path_Cycle: boolean;                // 路徑是否閉環
        private Path_Speed: number;                 // 路徑移動速度
        private Path_Waypoints: Array<ParticlePoint>; // 路徑點位

        // ----------------------------------------------------
        public constructor() {
            super();

            this.touchEnabled = false;
            this.touchChildren = false;
            this.visible = false;
            this.display = new egret.DisplayObjectContainer();
            this.display.touchEnabled = false;
            this.display.touchChildren = false;
            this.addChild(this.display);
        }

        public Test(): void {
            console.log("..............................................");
        }

        /** 讓使用者 */
        public initConfig(tempConfig): void {

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
                var _Path_Waypoints: Array<ParticlePoint> = [];
                for (var i = 0; i < Len; i++) {
                    var Waypoints: ParticlePoint = new ParticlePoint();
                    Waypoints.x = ConfigPathData[i][0];
                    Waypoints.y = ConfigPathData[i][1];
                    _Path_Waypoints[i] = Waypoints;
                }
                this.Path_Waypoints = _Path_Waypoints;
            }

            // -------------- 數據計算 --------------
            this.ScaleAdjust_Weights = ParticleMath.getDistribution_Weights(_Config.ParticeScaleAdjust_SD, _Config.ParticeScaleAdjust_Size);
            this.ScaleAdjust_Values = ParticleMath.getDistribution_Values(_Config.ParticeScaleAdjust_Min, _Config.ParticeScaleAdjust_Max, this.ScaleAdjust_Weights);

            // -------------- MovieClip獲取資料 --------------
            var data = RES.getRes(_Config.ParticeSystemMovieClipData + "_json");
            var texture = RES.getRes(_Config.ParticeSystemMovieClipData + "_png");
            var _mcFactory = new egret.MovieClipDataFactory(data, texture);

            var _pool: Array<Particle> = [];
            var Rate: number = this.emissionRate * 3; // 先建立會用到的粒子，根據經驗 * 3 的數量為必定會使用到，還不如提前創建好
            var _display: egret.DisplayObjectContainer = this.display;
            for (var i = 0; i < Rate; i++) {
                var cmpParticle: Particle = new Particle();
                cmpParticle.mInit(_mcFactory.generateMovieClipData(), _display); // 初始化
                if (DEBUG)
                    cmpParticle.ID = i;
                _pool.push(cmpParticle); // 塞入等待被使用的池內
            }
            if (DEBUG)
                this.ParticeID = i;
            this.pool = _pool;
            this.mcFactory = _mcFactory;
        }

        private ConversionJson(_Config) {
            var tempConfig: ParticleSetting = new ParticleSetting();
            tempConfig.setConfig(_Config);
            return tempConfig;

        }

        /** 開始粒子表演
         * @param duration 粒子系統噴發的時間，-1代表重複撥放    */
        public start(duration: number = this.Config.ParticeSystemPlayTime): void {

            if (this.Config == null)
                throw Error("Config Data is null. please init first");

            this.stop(); // 先停止
            this.visible = true; // 播放的話就讓他顯示
            if (DEBUG)
                if (this.Config.ParticeIsAutoFixVisible == true)
                    ParticeSystem.MaxDisplayTime = 0;

            this.totalTime = duration; // 紀錄時間
            this.NowPlayTime = 0;
            egret.startTick(this.countTime, this); // 開始計時執行
            this.timeStamp = egret.getTimer(); // 紀錄當前開始的時間

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
        }

        private countTime(timeStamp) {
            var dt: number = timeStamp - this.timeStamp; // 紀錄時間差
            this.timeStamp = timeStamp; // 儲存新的時間

            this.NowPlayTime += dt; // 累加時間

            // ---------- 修改噴發時間 ----------
            if (this.totalTime != -1) // 如果持續時間不是重複撥放
            {
                this.totalTime -= dt; // 減少時間
                if (this.totalTime < 0) // 如果時間到了
                    this.totalTime = 0;
            }

            // ---------- 更新粒子時間 ----------
            var particle: Particle;
            var particleIndex: number = 0;
            var _particles = this.particles;
            var newDt = dt * this.timeMul;
            while (particleIndex < this.numParticles) // 更新每個存活的粒子
            {
                particle = _particles[particleIndex]; // 獲取粒子
                if (particle.currentTime < particle.totalTime) // 如果這個粒子還活著的化
                {
                    particle.mUpdate(newDt); // 更新Frame系列行為
                    particle.currentTime += newDt; // 累加時間
                    particleIndex++; // 進行下一個粒子判斷
                }
                else // 這個粒子時間已經到了，我將要刪除他
                    this.removeParticle(particle); // 移除粒子到物件池內
            }

            // ---------- 檢查事件時間點 ----------
            if (this.IsSendTimeEvent == true) {
                var Len = this.lstEventTime.length;
                var _lstEventName: Array<string> = this.lstEventName;
                var _lstEventTime: Array<number> = this.lstEventTime;
                var NowTime: number = this.NowPlayTime;

                for (var i = 0; i < Len; i++) {
                    var CheckTime: number = _lstEventTime[i];
                    if (CheckTime < NowTime) {
                        EventSystem.on_event(eEvent.on_particles_event, this, _lstEventName[i]);
                        _lstEventTime.splice(i, 1);
                        _lstEventName.splice(i, 1);
                    }
                }
                if (Len == 0)
                    this.IsSendTimeEvent = false;
            }


            if (this.totalTime == 0) // 如果粒子系統不在產出粒子的話，進行通知
            {
                egret.clearInterval(this.IntervalCode)
                EventSystem.on_event(eEvent.on_particles_stop, this);
            }

            if (this.numParticles == 0 && this.totalTime == 0) // 如果時間到的話
            {
                this.visible = false;
                egret.stopTick(this.countTime, this); // 時間到的話，就移除
                EventSystem.on_event(eEvent.on_particles_done, this);

                if (DEBUG)
                    if (this.Config.ParticeIsAutoFixVisible == true)
                        console.log("當前設定的SaveTime 有效能問題，粒子在第" + ParticeSystem.MaxDisplayTime + " 豪秒，就不在畫面上了")
            }

            return false;
        }



        /** 粒子系統的Frame行為
        * @param timeStamp 系統給的時間標籤 */
        private update(): boolean {
            var now = egret.getTimer();
            var RateTime: number = 1000 / this.emissionRate;
            var dt = now - this.LastStartTime;
            this.LastStartTime = now;
            if (this.totalTime == -1 || this.totalTime > 0) // 如果粒子播放時間還沒結束的話
            {
                this.offsetTime = 0;
                this.FreamTime += dt;
                while (this.FreamTime > 0) {
                    this.addOneParticle(); // 產出粒子
                    this.FreamTime -= RateTime;
                }
            }
            return false;
        }

        /** 停止粒子
         * @param clear 是否清除掉现有粒子 */
        public stop(clear: boolean = false): void {
            egret.clearInterval(this.IntervalCode);

            if (clear == true) {
                this.visible = false;
                this.clear();
                egret.stopTick(this.countTime, this);
            }
        }

        /** 獲取一個粒子，並進行激活動作*/
        private addOneParticle(): void {
            //todo 这里可能需要返回成功与否
            var cmpParticle: Particle = this.getParticle();

            if (this.Path_Mode == false)
                cmpParticle.mStart(this.Config, this.getStartPostition(), this.ScaleAdjust_Weights, this.ScaleAdjust_Values);
            else {
                cmpParticle.mStart(this.Config, this.getNextPathPosition(this.offsetTime), this.ScaleAdjust_Weights, this.ScaleAdjust_Values);
                this.offsetTime += 1000 / this.emissionRate;
            }

            this.particles.push(cmpParticle);
            this.numParticles++;
        }

        /** 獲取一個沒再使用的粒子 */
        private getParticle(): Particle {
            var result: Particle;
            if (this.pool.length > 0)
                result = this.pool.pop(); // 從池子裏面拿出物件，凡是在池子裡面的都是沒有被使用到的物件
            else {
                result = new Particle();
                result.mInit(this.mcFactory.generateMovieClipData(), this.display);
                if (DEBUG)
                    result.ID = ++this.ParticeID;
            }

            return result;
        }

        /** 獲取噴發位置 */
        private getStartPostition() {
            var offsetX = this.emitterX;
            var offsetY = this.emitterY;
            var PPoint = {
                x: ParticleMath.getRandom(-offsetX, offsetX),
                y: ParticleMath.getRandom(-offsetY, offsetY)
            };

            return PPoint;
        }

        /** 刪除某個粒子，其實也不是刪除，只是把他丟到池子 */
        private removeParticle(particle: Particle): void {
            var index = this.particles.indexOf(particle); // 如果該粒子存在總控制攔的話
            if (index != -1)  // 如果要刪除某個存在的粒子
            {
                particle.mStop(); // 先暫停這個粒子
                this.particles.splice(index, 1); // 移除這個粒子於總控制區域
                this.pool.push(particle); // 丟入等待被使用的池子
                this.numParticles--;// 減少當前使用的Count
            }
        }

        /** 清除所有粒子 */
        private clear(): void {
            var _particles = this.particles;
            var _Len = _particles.length;
            for (var i = 0; i < _Len; i++)
                this.removeParticle(_particles[0]);

            this.numParticles = 0;
        }

        // -------------------------- 曲線函數 --------------------------
        /** 初始化路径 */
        private preProcessPath() {
            var Waypoints: Array<ParticlePoint> = this.Path_Waypoints;
            var lastWp: ParticlePoint = Waypoints[0]; // 先設定第一個當作判斷用的變數
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

            var firstWp: ParticlePoint = Waypoints[0];
            var lastSpan = this.calcnDistance(firstWp, Waypoints[_Len - 1]); // 獲取最後的距離
            totalDistance += lastSpan;
            this.TotalPathDistance = totalDistance;

            firstWp.index = 0;
            firstWp.totalDistance = totalDistance;
            firstWp.spanDistance = lastSpan;
        };

        /** 計算距離，使用畢氏定理去計算 */
        private calcnDistance(P1: ParticlePoint, P2: ParticlePoint): number {
            var xd = P1.x - P2.x;
            var yd = P1.y - P2.y;
            return Math.sqrt(xd * xd + yd * yd); // 使用畢氏定理獲取距離
        }

        /** 根據當前時間，判斷要獲取的點位在哪 */
        private getNextPathPosition(msOffset) {
            var Waypoints: Array<ParticlePoint> = this.Path_Waypoints;
            var _Len: number = Waypoints.length;
            var elapsed = this.NowPlayTime + msOffset;
            var targetDistance = elapsed * this.Path_Speed * 20;

            if (this.Path_Cycle == false) // 沒有close loop 就在最後一個點結束
                if (targetDistance > Waypoints[_Len - 1].totalDistance - 10)
                    egret.clearInterval(this.IntervalCode);

            targetDistance = this.normalize(targetDistance, this.TotalPathDistance);
            var startLoop: number = _Len - 1
            for (var i = startLoop; i >= 1; i--)
                if (targetDistance > Waypoints[i].totalDistance) // 尋找符合的點位
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
        }

        /** 進行適配性的操作 */
        private normalize(value, fit) {
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
        }

        // -------------------------------------------------------

        public setEmissionRate(value: number) {
            this.stop(true);
            this.Config.ParticeSystemEmissionRate = value;
            this.emissionRate = value;
            this.start();
        }

        public setPlayTime(value: number) {
            this.stop(true);
            this.Config.ParticeSystemPlayTime = value * 1000;
            this.totalTime = value * 1000;
            this.start();
        }

        public setPlayTimeMul(value: number) {
            this.stop(true);
            this.Config.ParticeSystemPlayTimeMul = value / 100;
            this.timeMul = value / 100;
            this.start();
        }

        public setLocation_X(value: number) {
            this.stop(true);
            let temp_x: number = (this.IsVertical) ? 360 : 640;
            this.Config.ParticeSystemLocation_X = value + temp_x;
            this.x = value + temp_x;
            this.start();
        }

        public setLocation_Y(value: number) {
            this.stop(true);
            let temp_y: number = (this.IsVertical) ? 640 : 360;
            this.Config.ParticeSystemLocation_Y = value + temp_y;
            this.y = value + temp_y;
            this.start();
        }

        public setEmitter_X(value: number) {
            this.stop(true);
            this.Config.ParticeEmitter_X = value;
            this.emitterX = value;
            this.start();
        }

        public setEmitter_Y(value: number) {
            this.stop(true);
            this.Config.ParticeEmitter_Y = value;
            this.emitterY = value;
            this.start();
        }

        public setGravity_X(value: number) {
            this.stop(true);
            this.Config.ParticeGravity_X = value / 1000;
            this.start();
        }

        public setGravity_Y(value: number) {
            this.stop(true);
            this.Config.ParticeGravity_Y = value / 1000;
            this.start();
        }

        public setSaveTime_Min(value: number) {
            this.stop(true);
            this.Config.ParticeSaveTime_Min = value * 1000;
            this.start();
        }

        public setSaveTime_Max(value: number) {
            this.stop(true);
            this.Config.ParticeSaveTime_Max = value * 1000;
            this.start();
        }

        public setBleanModeType(value: string) {
            this.stop(true);
            this.Config.ParticeBleanModeType = value;
            this.start();
        }

        public setIsRandomFrame(value: boolean) {
            this.stop(true);
            this.Config.ParticeIsRandomFrame = value;
            this.start();
        }

        public setFireSpeed_Min(value: number) {
            this.stop(true);
            this.Config.ParticeFireSpeed_Min = value / 100;
            this.start();

        }

        public setFireSpeed_Max(value: number) {
            this.stop(true);
            this.Config.ParticeFireSpeed_Max = value / 100;
            this.start();

        }

        public setDrag(value: number) {
            this.stop(true);
            this.Config.ParticeDrag = value / 1000000;
            this.start();
        }

        public setDirection_Min(value: number) {
            this.stop(true);
            this.Config.ParticeDirection_Min = value;
            this.start();
        }

        public setDirection_Max(value: number) {
            this.stop(true);
            this.Config.ParticeDirection_Max = value;
            this.start();
        }

        public setScale_Min(value: number) {
            this.stop(true);
            this.Config.ParticeScale_Min = value / 100;
            this.start();
        }

        public setScale_Max(value: number) {
            this.stop(true);
            this.Config.ParticeScale_Max = value / 100;
            this.start();
        }

        public setScaleAdjust_Min(value: number) {
            this.stop(true);
            this.Config.ParticeScaleAdjust_Min = value / 100;
            this.ScaleAdjust_Values = ParticleMath.getDistribution_Values(value / 100, this.Config.ParticeScaleAdjust_Max, this.ScaleAdjust_Weights);
            this.start();
        }

        public setScaleAdjust_Max(value: number) {
            this.stop(true);
            this.Config.ParticeScaleAdjust_Max = value / 100;
            this.ScaleAdjust_Values = ParticleMath.getDistribution_Values(this.Config.ParticeScaleAdjust_Min, value / 100, this.ScaleAdjust_Weights);
            this.start();
        }

        public setScaleAdjust_Size(value: number) {
            this.stop(true);
            this.Config.ParticeScaleAdjust_Size = value;
            this.ScaleAdjust_Weights = ParticleMath.getDistribution_Weights(this.Config.ParticeScaleAdjust_SD, value);
            this.ScaleAdjust_Values = ParticleMath.getDistribution_Values(this.Config.ParticeScaleAdjust_Min, this.Config.ParticeScaleAdjust_Max, this.ScaleAdjust_Weights);
            this.start();
        }

        public setScaleAdjust_SD(value: number) {
            this.stop(true);
            this.Config.ParticeScaleAdjust_SD = value;
            this.ScaleAdjust_Weights = ParticleMath.getDistribution_Weights(value, this.Config.ParticeScaleAdjust_Size);
            this.ScaleAdjust_Values = ParticleMath.getDistribution_Values(this.Config.ParticeScaleAdjust_Min, this.Config.ParticeScaleAdjust_Max, this.ScaleAdjust_Weights);
            this.start();
        }


        public setRotation_Min(value: number) {
            this.stop(true);
            this.Config.ParticleRotation_Min = value;
            this.start();
        }

        public setRotation_Max(value: number) {
            this.stop(true);
            this.Config.ParticleRotation_Max = value;
            this.start();
        }

        public setRotationSpeed_Min(value: number) {
            this.stop(true);
            this.Config.ParticleRotationSpeed_Min = value;
            this.start();
        }

        public setRotationSpeed_Max(value: number) {
            this.stop(true);
            this.Config.ParticleRotationSpeed_Max = value;
            this.start();
        }

        public setStartAlpha_Min(value: number) {
            this.stop(true);
            this.Config.ParticleStartAlpha_Min = value / 100;
            this.start();
        }

        public setStartAlpha_Max(value: number) {
            this.stop(true);
            this.Config.ParticleStartAlpha_Max = value / 100;
            this.start();
        }

        public setEndAlpha_Min(value: number) {
            this.stop(true);
            this.Config.ParticleEndAlpha_Min = value / 100;
            this.start();
        }

        public setEndAlpha_Max(value: number) {
            this.stop(true);
            this.Config.ParticleEndAlpha_Max = value / 100;
            this.start();
        }


        public setIsSystemPathMode(value: boolean) {
            this.stop(true);
            this.Path_Mode = value;
            if (value) {
                this.Path_Cycle = this.Config.ParticlePathCycle;
                this.Path_Speed = this.Config.ParticlePathSpeed;

                var ConfigPathData = this.Config.ParticlePathWaypoints;
                var Len = ConfigPathData.length;
                var _Path_Waypoints: Array<ParticlePoint> = [];
                for (var i = 0; i < Len; i++) {
                    var Waypoints: ParticlePoint = new ParticlePoint();
                    Waypoints.x = ConfigPathData[i][0];
                    Waypoints.y = ConfigPathData[i][1];
                    _Path_Waypoints[i] = Waypoints;
                }
                this.Path_Waypoints = _Path_Waypoints;
            }


            this.start();
        }

        public setPathCycle(value: boolean) {
            this.stop(true);
            this.Path_Cycle = value;
            this.start();
        }

        public setPathSpeed(value: number) {
            this.stop(true);
            this.Path_Speed = value;
            this.start();
        }

        public setPathWaypoints_Add(x: number, y: number) {
            this.stop(true);
            var Waypoints: ParticlePoint = new ParticlePoint();
            Waypoints.x = x;
            Waypoints.y = y;
            this.Path_Waypoints.push(Waypoints);
            this.start();
        }
        public setPathWaypoints_Edit(x: number, y: number, EditLocation: number) {
            this.stop(true);

            this.Path_Waypoints[EditLocation].x = x;
            this.Path_Waypoints[EditLocation].y = y;

            this.start();
        }
        public setPathWaypoints_Remove(value: number) {
            this.stop(true);
            var t: Array<ParticlePoint> = new Array<ParticlePoint>(); // 路徑點位
            for (var i = 0; i < this.Path_Waypoints.length; i++) {
                if (i == value)
                    continue;
                t.push(this.Path_Waypoints[i]);
            }
            this.Path_Waypoints = t;
            this.start();
        }
    }
}