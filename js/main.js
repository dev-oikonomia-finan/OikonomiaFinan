sb.auth.getSession().then(({data:{session}})=>session?start():show("login"));
