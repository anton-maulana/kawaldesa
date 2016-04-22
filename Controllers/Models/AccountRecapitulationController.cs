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
    public class AccountRecapitulationController : ReadOnlyController<AccountRecapitulation, string>
    {
        public AccountRecapitulationController(DB dbContext)
            : base(dbContext)
        {
        }

        
        protected override IQueryable<AccountRecapitulation> ApplyQuery(IQueryable<AccountRecapitulation> query)
        {
            var Id = GetQueryString<string>("Id");
            var regionId = GetQueryString<string>("RegionId");

            return query.Where(t => t.ApbnKey=="2015p");
        }

   }
}