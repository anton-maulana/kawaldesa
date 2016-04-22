﻿using App.Models;
using Microvac.Web;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Http;
using System.Net.Http;
using System.Net;
using Microvac.Web.Validation;
using Microvac.Web.ControllerExtensions;

namespace App.Controllers.Models
{
    public class ApbdesController : ReadOnlyController<Apbdes, long>
    {
        public ApbdesController(DB dbContext)
            : base(dbContext)
        {
            dbContext.Configuration.ProxyCreationEnabled = false;
            ListInclude(e => e.Region);
        }


        [HttpPost]
        [Authorize(Roles = Role.VOLUNTEER_ACCOUNT)]
        
        public void UpdateSources(Multipart multipart)
        {
            try
            {
                var apbdesId = long.Parse(multipart.Forms["Id"]);
                var sourceURL = multipart.Forms["SourceURL"];
                
                /*
                var apbdes = dbSet.SelectOne(apbdesId, 
                    s => new { s.IsCompleted, fkRegionId = s.fkRegionId });
                if (apbdes.IsCompleted)
                    throw new ApplicationException("apbdes is completed");
                KawalDesaController.CheckRegionAllowed(dbContext, apbdes.fkRegionId);
                */
                var fileResult = multipart.Files[0];
                var blob = new Blob(fileResult);
                dbContext.Set<Blob>().Add(blob);

                /*
                Update(apbdesId)
                    .Set(e => e.SourceUrl, sourceURL)
                    .Set(e => e.fkSourceFileId, blob.Id)
                    .Save();
                 */   
                fileResult.Move(blob.FilePath);
            }
            finally
            {
                multipart.DeleteUnmoved();
            }
        }

        [HttpPost]
        [Authorize(Roles = Role.VOLUNTEER_ACCOUNT)]
        public void Complete(long apbdesId)
        {
            var apbdes = dbSet.Find(apbdesId);
            //if (apbdes.IsCompleted)
                //throw new ApplicationException("apbdes is completed");
            KawalDesaController.CheckRegionAllowed(dbContext, apbdes.fkRegionId);

            //apbdes.IsCompleted = true;
            dbContext.Entry(apbdes).State = EntityState.Modified;
            dbContext.SaveChanges();
        }

        [HttpPost]
        public void AddAccounts(long apbdesId, long rootAccountId, [FromBody] List<Account> accounts)
        {
            /* Fetches */

            var apbdes = Get(apbdesId);
            //if (apbdes.IsCompleted)
                //throw new ApplicationException("apbdes is completed");
            KawalDesaController.CheckRegionAllowed(dbContext, apbdes.fkRegionId);

            var rootAccount = dbContext.Set<Account>().Find(rootAccountId);

            var existingAccounts = apbdes.Accounts
                .Where(a => a.Type == rootAccount.Type)
                .ToList();

            var allAccounts = existingAccounts
                .Union(accounts)
                .ToList();

            /* Cleanups */

            foreach (var account in accounts)
            {
                if (!string.IsNullOrEmpty(account.Code))
                {
                    account.Code = Regex.Replace(account.Code, @"\s+", "");
                    account.Type = rootAccount.Type;
                    account.fkApbdesId = apbdes.Id;
                }
            }

            /* Validate */

            this.ModelState.Clear();
            this.Validate(accounts);
            if (!ModelState.IsValid)
                throw new HttpResponseException(Request.CreateErrorResponse(HttpStatusCode.BadRequest, ModelState));

            var invalids = new List<Invalid>();

            var accountCodesSet = new HashSet<String>(existingAccounts.Select(e => e.Code));
            for (var i = 0; i < accounts.Count; i++)
            {
                var field = String.Format("[{0}].{1}", i, "Code");
                var account = accounts[i];

                if (!Regex.IsMatch(account.Code, @"[\d\.]+"))
                    invalids.Add(new Invalid(field, "Kode tidak valid"));  
  
                if (accountCodesSet.Contains(account.Code))
                    invalids.Add(new Invalid(field, "Kode sudah terdaftar"));  
               
                accountCodesSet.Add(account.Code);
                
                var parentCode = account.ParentCode;
                if (!allAccounts.Any(a => a.Code == parentCode))
                    invalids.Add(new Invalid(field, "Anggaran tidak mempunyai induk anggaran")); 
            }

            this.ValidateWith(invalids);

            /* Persist */

            foreach (var account in accounts.OrderBy(a => a.Code))
            {
                var parentAccount = allAccounts.First(a => a.Code == account.ParentCode);
                account.fkParentAccountId = parentAccount.Id;

                dbContext.Set<Account>().Add(account);
                dbContext.SaveChanges();
            }

            foreach (var account in accounts.OrderByDescending(a => a.Code))
            {
                var childAccounts = allAccounts.Where(a => a.ParentCode == account.Code).ToList();
                if (childAccounts.Count > 0)
                {
                    account.Amount = null;
                    dbContext.Entry(account).State = EntityState.Modified;
                    dbContext.SaveChanges();
                }
            }
        }

        public Apbdes GetByRegionId(string regionId)
        {
            return dbSet.Include(e => e.Accounts).FirstOrDefault(e => e.fkRegionId == regionId);
        }


    }
}