﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net.Mail;
using System.Configuration;
using System.IO;
using System.Net.Mime;
using Mandrill;
using ActionMailerNext.Interfaces;

namespace App.Utils.Mail
{
    using System.Text;
    using Mandrill.Models;
    using ActionMailerNext;
    using Mandrill.Requests.Messages;

    public class MandrillMailSender : IMailSender, IDisposable
    {
        private IMailInterceptor _interceptor;
        private MandrillApi _client;

        public MandrillMailSender() : this(ConfigurationManager.AppSettings["MandrillApiKey"], null) { }

        public MandrillMailSender(string apiKey, IMailInterceptor interceptor)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new ArgumentNullException("apiKey",
                    "The AppSetting 'MandrillApiKey' is not defined. Either define this configuration section or use the constructor with apiKey parameter.");

            _interceptor = interceptor;
            _client = new MandrillApi(apiKey);
        }

        /// <summary>
        ///     Creates a MailMessage for the current MailAttribute instance.
        /// </summary>
        protected EmailMessage GenerateProspectiveMailMessage(MailAttributes mail)
        {
            //create base message
            var message = new EmailMessage
            {
                FromName = mail.From.DisplayName,
                FromEmail = mail.From.Address,
                To = mail.To.Union(mail.Cc).Select(t => new EmailAddress(t.Address, t.DisplayName)),
                BccAddress = mail.Bcc.Any() ? mail.Bcc.First().Address : null,
                Subject = mail.Subject,
                Important = mail.Priority == MailPriority.High ? true : false
            };

            // We need to set Reply-To as a custom header
            if (mail.ReplyTo.Any())
            {
                message.AddHeader("Reply-To", string.Join(" , ", mail.ReplyTo));
            }

            // Adding content to the message
            foreach (var view in mail.AlternateViews)
            {
                var reader = new StreamReader(view.ContentStream, Encoding.UTF8, true, 1024, true);

                var body = reader.ReadToEnd();

                if (view.ContentType.MediaType == MediaTypeNames.Text.Plain)
                {
                    message.Text = body;
                }
                if (view.ContentType.MediaType == MediaTypeNames.Text.Html)
                {
                    message.Html = body;
                }
            }

            // Going through headers and adding them to the message
            mail.Headers.ToList().ForEach(h => message.AddHeader(h.Key, h.Value));

            // Adding the attachments
            var attachments = new List<EmailAttachment>();
            foreach (var mailAttachment in mail.Attachments.Select(attachment => ActionMailerNext.Utils.AttachmentCollection.ModifyAttachmentProperties(attachment.Key, attachment.Value, false)))
            {
                using (var stream = new MemoryStream())
                {
                    mailAttachment.ContentStream.CopyTo(stream);
                    var base64Data = Convert.ToBase64String(stream.ToArray());
                    attachments.Add(new EmailAttachment
                    {
                        Content = base64Data,
                        Name = mailAttachment.Name,
                        Type = mailAttachment.ContentType.MediaType,
                    });
                }
            }

            message.Attachments = attachments;

            return message;
        }

        #region Send methods

        public virtual List<IMailResponse> Deliver(IEmailResult emailResult)
        {
            return this.Send(emailResult.MailAttributes);
        }

        public virtual List<IMailResponse> Send(MailAttributes mailAttributes)
        {
            var mail = GenerateProspectiveMailMessage(mailAttributes);
            var response = new List<IMailResponse>();
            var request = new SendMessageRequest(mail);

            var resp = AsyncHelpers.RunSync(() => _client.SendMessage(request));
            response.AddRange(resp.Select(result => new MandrillMailResponse
            {
                Email = result.Email,
                Status = MandrillMailResponse.GetProspectiveStatus(result.Status.ToString()),
                RejectReason = result.RejectReason,
                Id = result.Id
            }));

            return response;
        }

        /// <summary>
        ///     Sends your message asynchronously.  This method does not block.  If you need to know
        ///     when the message has been sent, then override the OnMailSent method in MailerBase which
        ///     will not fire until the asyonchronous send operation is complete.
        /// </summary>
        public async Task<MailAttributes> DeliverAsync(IEmailResult emailResult)
        {
            var deliverTask = this.SendAsync(emailResult.MailAttributes);
            await deliverTask.ContinueWith(t => AsyncSendCompleted(emailResult.MailAttributes));

            return emailResult.MailAttributes;
        }

        public virtual async Task<List<IMailResponse>> SendAsync(MailAttributes mailAttributes)
        {
            var mail = GenerateProspectiveMailMessage(mailAttributes);
            var response = new List<IMailResponse>();
            var request = new SendMessageRequest(mail);

            await _client.SendMessage(request).ContinueWith(x => response.AddRange(x.Result.Select(result => new MandrillMailResponse
            {
                Email = result.Email,
                Status = MandrillMailResponse.GetProspectiveStatus(result.Status.ToString()),
                RejectReason = result.RejectReason,
                Id = result.Id
            })));

            return response;
        }

        #endregion

        #region Private methods

        private void AsyncSendCompleted(MailAttributes mail)
        {
            _interceptor.OnMailSent(mail);
        }

        #endregion

        #region Dispose

        public void Dispose()
        {
            this.Dispose(false);
            GC.SuppressFinalize(true);
        }

        protected virtual void Dispose(bool disposing)
        {
        }

        #endregion
    }
}
