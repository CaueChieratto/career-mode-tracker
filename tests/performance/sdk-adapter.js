let sequence = 0;
const emit = event => globalThis.__perfEmit(event);
const pathOf = ref => ref.path || ref._query?.path?.canonicalString() || 'unknown';
export async function read(fn, args, source) {
  const id = ++sequence, path = pathOf(args[0]);
  emit({kind:'read-start',id,path,source});
  try {
    const result = await fn(...args);
    emit({kind:'read-end',id,path,source,documents:result.size ?? (result.exists() ? 1 : 0), fromCache:result.metadata.fromCache});
    return result;
  } catch(error) { emit({kind:'read-error',id,path,source,error:String(error)}); throw error; }
}
export function listen(fn, args, source) {
  const id=++sequence,path=pathOf(args[0]);
  emit({kind:'listen-start',id,path,source});
  const index=args.findIndex((x,i)=>i>0 && typeof x === 'function');
  const callback=args[index];
  if (index<0) throw new Error('Unsupported observer overload; extend test adapter explicitly');
  args[index]=snapshot=>{emit({kind:'listen-callback',id,path,source,documents:snapshot.size ?? (snapshot.exists()?1:0),fromCache:snapshot.metadata.fromCache});return callback(snapshot);};
  const unsubscribe=fn(...args);
  return ()=>{emit({kind:'listen-stop',id,path,source});unsubscribe();};
}
export function authListen(fn,args,source) {
  const id=++sequence, callback=args[1];
  emit({kind:'auth-start',id,source});
  args[1]=user=>{emit({kind:'auth-callback',id,source,authenticated:!!user});return callback(user);};
  const unsubscribe=fn(...args);
  return ()=>{emit({kind:'auth-stop',id,source});unsubscribe();};
}
