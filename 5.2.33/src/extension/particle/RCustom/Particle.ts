module RCustom {
    export class Particle extends egret.MovieClip {

        public ID: number;

        public totalTime: number = 0;           // 該粒子的存活時間
        public currentTime: number = 0;         // 該粒子的當前時間

        private Config: ParticleSetting;        // Json配置文件
        private parentStage: egret.DisplayObjectContainer; // 顯示容器

        private ScaleAdjust: number;            // 放大曲線

        private Gravity_X: number;              // 重力 for X
        private Gravity_Y: number;              // 重力 for Y

        private velocity: number;
        private velocityX: number;
        private velocityY: number;

        private Drag: number;                   // 回拖

        private RotationSpeed: number;          // 旋轉速度
        private EndAlpha: number;               // 結束的透明度
        private AlphaDelta: number;             // 透明度變化

        private NowGravity_X: number = 0;
        private NowGravity_Y: number = 0;

        private DebugVisbleTime: number;

        // ----------------- 數據 -----------------

        public constructor() {
            super();
            this.touchEnabled = false;
        }

        public mInit(_movieClipData: egret.MovieClipData, _parentStage: egret.DisplayObjectContainer) {

            if (this.parent != _parentStage) // 如果舞台不相同，就進行舞台修改
            {
                this.parentStage = _parentStage;
                _parentStage.addChild(this);
            }

            if (this.movieClipData != _movieClipData) // 如果資料不相同，就進行修正 
            {
                this.movieClipData = _movieClipData;
                this.anchorOffsetX = this.width / 2;
                this.anchorOffsetY = this.height / 2;
            }

            this.visible = false;
        }

        public mStart(_Config: ParticleSetting, LocationPoint, ScaleAdjust_Weights: Array<number>, ScaleAdjust_Values: Array<number>) {
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
            self.totalTime = ParticleMath.getRandom(_Config.ParticeSaveTime_Min, _Config.ParticeSaveTime_Max);

            var Dir = ParticleMath.getRandom(_Config.ParticeDirection_Min, _Config.ParticeDirection_Max);
            self.velocityX = Math.sin(Math.PI / 180 * Dir);
            self.velocityY = -Math.cos(Math.PI / 180 * Dir);

            self.velocity = ParticleMath.getRandom(_Config.ParticeFireSpeed_Min, _Config.ParticeFireSpeed_Max);

            self.scaleX = self.scaleY = ParticleMath.getRandom(_Config.ParticeScale_Min, _Config.ParticeScale_Max)
            self.ScaleAdjust = ParticleMath.getWeightsValue(ScaleAdjust_Weights, ScaleAdjust_Values);

            self.alpha = ParticleMath.getRandom(_Config.ParticleStartAlpha_Min, _Config.ParticleStartAlpha_Max);
            self.EndAlpha = ParticleMath.getRandom(_Config.ParticleEndAlpha_Min, _Config.ParticleEndAlpha_Max);
            self.AlphaDelta = (self.EndAlpha - self.alpha) / self.totalTime;

            self.rotation = ParticleMath.getRandom(_Config.ParticleRotation_Min, _Config.ParticleRotation_Max);
            self.RotationSpeed = ParticleMath.getRandom(_Config.ParticleRotationSpeed_Min, _Config.ParticleRotationSpeed_Max);
        }

        public mUpdate(delta: number) {
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

            if (self.velocity > 0) // 回拖
                self.velocity -= self.Drag * delta;

            if (DEBUG)
                if (self.Config.ParticeIsAutoFixVisible == true)
                    self.checkVisible();

            if (self.scaleX < 0.05) {
                self.mStop();
                return;
            }
        }

        public mStop() {

            if (DEBUG)
                if (this.visible == false)
                    if (this.Config.ParticeIsAutoFixVisible == true)
                        ParticeSystem.MaxDisplayTime = Math.max(this.DebugVisbleTime, ParticeSystem.MaxDisplayTime)

            this.visible = false;
        }

        private checkVisible() {
            if (DEBUG) {
                var location: egret.Point = this.localToGlobal(); // 獲取全域位置
                var isIn_X: boolean = (location.x + this.width > 0) && (location.x - this.width < 720);
                var visibleResult: boolean = false;
                if (isIn_X == true) {
                    var isIn_Y: boolean = (location.y + this.height > 0) && (location.y - this.height < 1280);
                    visibleResult = isIn_Y;
                }
                if (visibleResult == false && this.visible == true)
                    this.DebugVisbleTime = this.currentTime;
                this.visible = visibleResult;
            }

        }
    }


}