declare module RCustom {
    class ParticeSystem extends egret.DisplayObjectContainer {
        IsVertical: boolean;
        private LastStartTime;
        private FreamTime;
        static MaxDisplayTime: number;
        private ParticeID;
        private mcFactory;
        private display;
        private IntervalCode;
        private numParticles;
        private pool;
        private particles;
        private timeStamp;
        private Config;
        private ScaleAdjust_Weights;
        private ScaleAdjust_Values;
        private TotalPathDistance;
        private NowPlayTime;
        private offsetTime;
        private emissionRate;
        private totalTime;
        private timeMul;
        private IsSendTimeEvent;
        private timeTag;
        private lstEventTime;
        private lstEventName;
        private emitterX;
        private emitterY;
        private Path_Mode;
        private Path_Cycle;
        private Path_Speed;
        private Path_Waypoints;
        constructor();
        Test(): void;
        /** 讓使用者 */
        initConfig(tempConfig: any): void;
        private ConversionJson(_Config);
        /** 開始粒子表演
         * @param duration 粒子系統噴發的時間，-1代表重複撥放    */
        start(duration?: number): void;
        private countTime(timeStamp);
        /** 粒子系統的Frame行為
        * @param timeStamp 系統給的時間標籤 */
        private update();
        /** 停止粒子
         * @param clear 是否清除掉现有粒子 */
        stop(clear?: boolean): void;
        /** 獲取一個粒子，並進行激活動作*/
        private addOneParticle();
        /** 獲取一個沒再使用的粒子 */
        private getParticle();
        /** 獲取噴發位置 */
        private getStartPostition();
        /** 刪除某個粒子，其實也不是刪除，只是把他丟到池子 */
        private removeParticle(particle);
        /** 清除所有粒子 */
        private clear();
        /** 初始化路径 */
        private preProcessPath();
        /** 計算距離，使用畢氏定理去計算 */
        private calcnDistance(P1, P2);
        /** 根據當前時間，判斷要獲取的點位在哪 */
        private getNextPathPosition(msOffset);
        /** 進行適配性的操作 */
        private normalize(value, fit);
        setEmissionRate(value: number): void;
        setPlayTime(value: number): void;
        setPlayTimeMul(value: number): void;
        setLocation_X(value: number): void;
        setLocation_Y(value: number): void;
        setEmitter_X(value: number): void;
        setEmitter_Y(value: number): void;
        setGravity_X(value: number): void;
        setGravity_Y(value: number): void;
        setSaveTime_Min(value: number): void;
        setSaveTime_Max(value: number): void;
        setBleanModeType(value: string): void;
        setIsRandomFrame(value: boolean): void;
        setFireSpeed_Min(value: number): void;
        setFireSpeed_Max(value: number): void;
        setDrag(value: number): void;
        setDirection_Min(value: number): void;
        setDirection_Max(value: number): void;
        setScale_Min(value: number): void;
        setScale_Max(value: number): void;
        setScaleAdjust_Min(value: number): void;
        setScaleAdjust_Max(value: number): void;
        setScaleAdjust_Size(value: number): void;
        setScaleAdjust_SD(value: number): void;
        setRotation_Min(value: number): void;
        setRotation_Max(value: number): void;
        setRotationSpeed_Min(value: number): void;
        setRotationSpeed_Max(value: number): void;
        setStartAlpha_Min(value: number): void;
        setStartAlpha_Max(value: number): void;
        setEndAlpha_Min(value: number): void;
        setEndAlpha_Max(value: number): void;
        setIsSystemPathMode(value: boolean): void;
        setPathCycle(value: boolean): void;
        setPathSpeed(value: number): void;
        setPathWaypoints_Add(x: number, y: number): void;
        setPathWaypoints_Edit(x: number, y: number, EditLocation: number): void;
        setPathWaypoints_Remove(value: number): void;
    }
}
declare module RCustom {
    class Particle extends egret.MovieClip {
        ID: number;
        totalTime: number;
        currentTime: number;
        private Config;
        private parentStage;
        private ScaleAdjust;
        private Gravity_X;
        private Gravity_Y;
        private velocity;
        private velocityX;
        private velocityY;
        private Drag;
        private RotationSpeed;
        private EndAlpha;
        private AlphaDelta;
        private NowGravity_X;
        private NowGravity_Y;
        private DebugVisbleTime;
        constructor();
        mInit(_movieClipData: egret.MovieClipData, _parentStage: egret.DisplayObjectContainer): void;
        mStart(_Config: ParticleSetting, LocationPoint: any, ScaleAdjust_Weights: Array<number>, ScaleAdjust_Values: Array<number>): void;
        mUpdate(delta: number): void;
        mStop(): void;
        private checkVisible();
    }
}
declare module RCustom {
    class ParticleMath {
        /** 獲取隨機數
         * @param min 獲取最小數值
         * @param max 獲取最大數值 */
        static getRandom(min: number, max: number): number;
        /** 實現常態分布標準差的權重表
         * @param SD 偏差值
         * @param Size 你想設定的權重Size    */
        static getDistribution_Weights(SD: number, WeightsSize: number): number[];
        /** 實現常態分布標準差的數值表
         * @param min 獲取最小數值
         * @param max 獲取最大數值
         * @param ValueSize 設定的長度為多少         */
        static getDistribution_Values(min: number, max: number, WeightsSize: Array<number>): number[];
        /** 根據各設定的權重的機率去獲取對應的數值
         * @param Weights 權重表
         * @param Values 數值表  */
        static getWeightsValue(Weights: Array<number>, Values: Array<number>): number;
    }
}
declare module RCustom {
    class ParticlePoint {
        x: number;
        y: number;
        index: number;
        spanDistance: number;
        totalDistance: number;
    }
}
declare module RCustom {
    class ParticleSetting {
        ParticeSystemMovieClipData: string;
        ParticeSystemEmissionRate: number;
        ParticeSystemPlayTime: number;
        ParticeSystemPlayTimeMul: number;
        ParticeSystemLocation_X: number;
        ParticeSystemLocation_Y: number;
        ParticeBleanModeType: string;
        ParticeIsRandomFrame: boolean;
        ParticeIsAutoFixVisible: boolean;
        ParticeEmitter_X: number;
        ParticeEmitter_Y: number;
        ParticeGravity_X: number;
        ParticeGravity_Y: number;
        ParticeSaveTime_Min: number;
        ParticeSaveTime_Max: number;
        ParticeDirection_Min: number;
        ParticeDirection_Max: number;
        ParticeFireSpeed_Min: number;
        ParticeFireSpeed_Max: number;
        ParticeDrag: number;
        ParticeScale_Min: number;
        ParticeScale_Max: number;
        ParticeScaleAdjust_Min: number;
        ParticeScaleAdjust_Max: number;
        ParticeScaleAdjust_SD: number;
        ParticeScaleAdjust_Size: number;
        ParticleRotation_Min: number;
        ParticleRotation_Max: number;
        ParticleRotationSpeed_Min: number;
        ParticleRotationSpeed_Max: number;
        ParticleStartAlpha_Min: number;
        ParticleStartAlpha_Max: number;
        ParticleEndAlpha_Min: number;
        ParticleEndAlpha_Max: number;
        ParticleIsSystemPathMode: boolean;
        ParticlePathCycle: boolean;
        ParticlePathSpeed: number;
        ParticlePathWaypoints: Array<ParticlePoint>;
        ParticleIsEventType: boolean;
        ParticleEventTime: Array<number>;
        ParticleEventName: Array<string>;
        setConfig(_Config: any): void;
    }
}
