function a(o){if(o==null)return"";const e=String(o),t=/^[=+\-@]/.test(e)?`'${e}`:e;return/[",;\n\r]/.test(t)?`"${t.replace(/"/g,'""')}"`:t}function p(o,e,t){const l=e.map(c=>a(c.label)).join(";"),i=t.map(c=>e.map(r=>a(r.get?r.get(c):c[r.key])).join(";")).join(`\r
`),d=new Blob(["\uFEFF"+l+`\r
`+i],{type:"text/csv;charset=utf-8;"}),s=URL.createObjectURL(d),n=document.createElement("a");n.href=s,n.download=`${o}-${new Date().toISOString().slice(0,10)}.csv`,document.body.appendChild(n),n.click(),n.remove(),setTimeout(()=>URL.revokeObjectURL(s),1e3)}export{p as e};
