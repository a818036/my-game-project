export function ActivityAnnouncer({message}:{message:string}){
  return <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{message}</p>;
}

export function LoadingScreen(){
  return <main className="loading"><p role="status" aria-live="polite" aria-atomic="true">正在開啟你的世界線……</p></main>;
}
