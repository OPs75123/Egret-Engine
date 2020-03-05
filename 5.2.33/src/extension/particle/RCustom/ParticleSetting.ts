module RCustom {
  export class ParticleSetting {
    public ParticeSystemMovieClipData: string = "null";   // 使用的素材
    public ParticeSystemEmissionRate: number = -1;        // 粒子噴發的數量

    public ParticeSystemPlayTime: number = -1;            // 粒子的噴發時間
    public ParticeSystemPlayTimeMul: number = -1;         // 粒子的噴發時間倍率影響

    public ParticeSystemLocation_X: number = -1;          // 粒子系統的位置
    public ParticeSystemLocation_Y: number = -1;          // 粒子系統的位置

    public ParticeBleanModeType: string = "";             // 粒子系統的混合模式
    public ParticeIsRandomFrame: boolean = false;         // 是否開始粒子隨機Frame功能
    public ParticeIsAutoFixVisible: boolean = false;      // 是否開啟檢查機制，用於判斷當粒子於畫面外的時候不進行渲染

    public ParticeEmitter_X: number = -1;                 // 粒子系統的噴發偏差位置上限
    public ParticeEmitter_Y: number = -1;                 // 粒子系統的噴發偏差位置上限

    public ParticeGravity_X: number = -1;                 // 粒子系統的重力 for 水平軸
    public ParticeGravity_Y: number = -1;                 // 粒子系統的重力 for 垂直軸

    public ParticeSaveTime_Min: number = -1;              // 粒子的存活時間 下限
    public ParticeSaveTime_Max: number = -1;              // 粒子的存活時間 上限

    public ParticeDirection_Min: number = -1;             // 粒子系統的發射方向 下限
    public ParticeDirection_Max: number = -1;             // 粒子系統的發射方向 上限

    public ParticeFireSpeed_Min: number = -1;             // 粒子力發射力道的 下限
    public ParticeFireSpeed_Max: number = -1;             // 粒子力發射力道的 上限
    public ParticeDrag: number = -1;                      // 粒子的回拖

    public ParticeScale_Min: number = -1;                 // 粒子基本大小 的 下限
    public ParticeScale_Max: number = -1;                 // 粒子基本大小 的 上限

    public ParticeScaleAdjust_Min: number = -1;           // 粒子放大縮小曲線 的 下限
    public ParticeScaleAdjust_Max: number = -1;           // 粒子放大縮小曲線 的 上限
    public ParticeScaleAdjust_SD: number = -1;            // 粒子放大縮小曲線 的 偏差值
    public ParticeScaleAdjust_Size: number = -1;          // 粒子放大縮小曲線 的 樣本數

    public ParticleRotation_Min: number = -1;             // 粒子的開始旋轉角度 下限
    public ParticleRotation_Max: number = -1;             // 粒子的開始旋轉角度 上限

    public ParticleRotationSpeed_Min: number = -1;        // 粒子的旋轉速度 下限
    public ParticleRotationSpeed_Max: number = -1;        // 粒子的旋轉速度 上限

    public ParticleStartAlpha_Min: number = -1;           // 粒子開始透明度 下限
    public ParticleStartAlpha_Max: number = -1;           // 粒子開始透明度 上限
    public ParticleEndAlpha_Min: number = -1;             // 粒子結束透明度 上限
    public ParticleEndAlpha_Max: number = -1;             // 粒子結束透明度 上限

    public ParticleIsSystemPathMode: boolean = false;    // 是否開啟路線模式
    public ParticlePathCycle: boolean = false;           // 是否開始路線Close Loop模式
    public ParticlePathSpeed: number = -1;               // 路線的速度
    public ParticlePathWaypoints: Array<ParticlePoint> = []; // 路線的點位

    public ParticleIsEventType: boolean = false;          // 是否有事件發生
    public ParticleEventTime: Array<number> = [];         // 事件的時間標籤
    public ParticleEventName: Array<string> = [];         // 事件的事件名稱

    public setConfig(_Config) {
      for (let key in _Config) {
        let value = _Config[key];

        if (value === null || value === '')
          continue; // 如果沒有數值 或是 空的 不做

        if ((key in this) == false)
          continue; // 沒有這個屬性 不做

        if (typeof value === 'number')
          this[key] = Number(value);
        else
          this[key] = value;
      }
    }
  }
}
