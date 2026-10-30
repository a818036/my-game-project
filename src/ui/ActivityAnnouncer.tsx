export function ActivityAnnouncer({message}:{message:string}){
  return <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{message}</p>;
}

export function LoadingScreen(){
  return <main className="loading"><p role="status" aria-live="polite" aria-atomic="true">正在開啟你的世界線……</p></main>;
}

export function StatusAlert({message,onRetry,retrying=false}:{message:string;onRetry?:()=>void;retrying?:boolean}){
  return message?<div className="notice"><p role="alert">{message}</p>{onRetry&&<button type="button" onClick={onRetry} disabled={retrying}>{retrying?'正在重新讀取…':'重新讀取存檔'}</button>}</div>:null;
}
