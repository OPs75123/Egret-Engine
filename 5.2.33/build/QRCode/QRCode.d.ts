declare class QRCode {
    constructor();
    makeCode(msg:string):void;
    getPoints():Array<Array<boolean>>;
}
