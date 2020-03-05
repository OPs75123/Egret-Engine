module RCustom {
    export class ParticleMath {

        /** 獲取隨機數
         * @param min 獲取最小數值
         * @param max 獲取最大數值 */
        public static getRandom(min: number, max: number): number {
            return Math.random() * (max - min) + min;
        }

        /** 實現常態分布標準差的權重表
         * @param SD 偏差值
         * @param Size 你想設定的權重Size    */
        public static getDistribution_Weights(SD: number, WeightsSize: number) {
            var Weights: Array<number> = [];

            if (SD == 0) {
                Weights.push(50);
                return Weights;
            }


            var HalfSize: number = WeightsSize / 2; // 等於 10 
            var SDPart: number = SD / HalfSize;

            var StartSize: number = HalfSize - 1;
            for (var i = 0; i < StartSize; i++) {
                var PartMul: number = HalfSize - i;
                var MulValue: number = SDPart * PartMul;
                Weights.push(50 - MulValue);
            }

            Weights.push(50);

            var EndSize: number = WeightsSize - 1;
            for (var i = HalfSize; i < EndSize; i++) {
                var PartMul: number = i - HalfSize + 1;
                var MulValue: number = SDPart * PartMul;
                Weights.push(50 + MulValue);
            }

            /* var Size: number = Weights.length;
             for (var i = 0; i < Size; i++)
                 console.log("[粒子] [權重測試] " + " 第 " + i + " 個  = " + Weights[i]);*/

            return Weights;
        }

        /** 實現常態分布標準差的數值表
         * @param min 獲取最小數值
         * @param max 獲取最大數值
         * @param ValueSize 設定的長度為多少         */
        public static getDistribution_Values(min: number, max: number, WeightsSize: Array<number>) {
            var Dif: number = max - min;
            var ValueSize: number = WeightsSize.length;
            var SinglePart: number = Dif / ValueSize;
            var aryValue: Array<number> = [];
            for (var i = 0; i < ValueSize; i++)
                aryValue.push(min + i * SinglePart)

            /* var Size: number = aryValue.length;
            for (var i = 0; i < Size; i++)
                console.log("[粒子] [數值測試] " + " 第 " + i + " 個  = " + aryValue[i]); */

            return aryValue;
        }

        /** 根據各設定的權重的機率去獲取對應的數值
         * @param Weights 權重表
         * @param Values 數值表  */
        public static getWeightsValue(Weights: Array<number>, Values: Array<number>) {
            var Size: number = Weights.length;
            var Sum: number = 0;
            for (var i = 0; i < Size; i++)
                Sum += Weights[i];

            var HitSumValue: number = this.getRandom(0, Sum);
            Sum = 0;
            for (var i = 0; i < Size; i++) {
                Sum += Weights[i];
                if (HitSumValue < Sum)    // 如果小於的話，那麼必定命中
                    return Values[i];
            }

            return Values[i - 1];
        }

    }
}
