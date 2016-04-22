using Microvac.Web;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.Data.Entity.ModelConfiguration;
using System.Linq;
using System.Web;

namespace App.Models.Views
{
    public class AccountRecapitulation : IModel<string>
    {
        public string Id { get; set; }

        public string RegionName { get; set; }

        public string RegionId { get; set; }        

        public string ApbnKey { get; set; }

        public string Income { get; set; }

        public string Expense { get; set; }
        
       }
}       
