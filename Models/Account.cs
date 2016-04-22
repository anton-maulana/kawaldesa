using Microvac.Web.Validation;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Http.Validation;

namespace App.Models
{
    public class Account : BaseEntity
    {
        public static IDictionary<AccountType, string> RootAccountCodes = new Dictionary<AccountType, string> 
        { 
            {AccountType.INCOME, "A"},
            {AccountType.EXPENSE, "B"}
        };

        [Required(ErrorMessage = "Kode harus diisi")]
        [RegularExpression(@"[a-zA-Z0-9\.]+", ErrorMessage = "Kode harus berupa digit atau titik")]
        //[Index("IX_Code_Type_fkApbdesId", 1, IsUnique = true)]
        public String Code { get; set; }

        [Required(ErrorMessage = "Nama harus diisi")]
        public String Name { get; set; }

        //[Index("IX_Code_Type_fkApbdesId", 2, IsUnique = true)]
        [Index]
        public AccountType Type { get; set; }

        public decimal? Amount { get; set; }

        public string Notes { get; set; }

        //[Index("IX_TargetSource_fkApbdesId", 2, IsUnique = true)]
        //[Index("IX_Code_Type_fkpbdesId", 3, IsUnique = true)]
        [Index]
        [ForeignKey("Apbdes")]
        public long fkApbdesId { get; set; }
        public virtual Apbdes Apbdes { get; set; }


        [ForeignKey("ParentAccount")]
        public long? fkParentAccountId { get; set; }
        public virtual Account ParentAccount { get; set; }



        [ForeignKey("CreatedBy")]
        public string fkCreatedById { get; set; }
        public virtual User CreatedBy { get; set; }

        [ForeignKey("ModifiedBy")]
        public string fkModifiedById { get; set; }
        public virtual User ModifiedBy { get; set; }

        public virtual List<Account> ChildAccounts { get; set; }

        public String ParentCode
        {
            get
            {
                return null;
            }
        }

        [NotMapped]
        public decimal TotalRealizationPerAccount
        {
            get
            {
                return 0;
            }
        }

    }
}