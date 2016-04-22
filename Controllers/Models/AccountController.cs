using App.Models;
using App.Models.Views;
using Microvac.Web;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;

namespace App.Controllers.Models
{
    public class AccountController : ReadOnlyController<Account, long>
    {
        public AccountController(DB dbContext)
            : base(dbContext)
        {
            dbContext.Configuration.ProxyCreationEnabled = false;

            SingleInclude(r => r.ParentAccount.ParentAccount, r => r.ParentAccount.ParentAccount.ParentAccount, r => r.ParentAccount.ParentAccount.ParentAccount.ParentAccount);
        }

        public IEnumerable<Account> GetAccountsByRegion(String regionId, AccountType type)
        {
            var apbdes = dbContext.Set<Apbdes>().FirstOrDefault(a => a.fkRegionId == regionId);
            if (apbdes == null)
                return new List<Account>();

            return dbSet.Where(e => e.fkApbdesId == apbdes.Id && e.Type == type).Take(40);
        }
    }
}