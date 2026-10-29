export function ActivityAnnouncer({message}:{message:string}){
  return <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{message}</p>;
}
