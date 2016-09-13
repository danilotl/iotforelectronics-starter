var express = require('express');
var router = express.Router();
var appEnv = require("cfenv").getAppEnv();

var sendgrid = require('sendgrid')('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');
//var sendgrid = require('sendgrid')('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');
var helper = require('sendgrid').mail;

/* GET home page. */
router.get('/', function(req, res) {

	var platformDashboard = 'https://new-console.stage1.ng.bluemix.net/apps/' + appEnv['app'].application_id + '?paneId=connected-objects';
	var mobileDownload = req.__('main_page.download_app_p2.text');
	var mobileDownloadLink = req.__('main_page.download_app_p2.link_on');
	var mobileInstructions = req.__('main_page.instructions.text');
	var mobileInstructionsLink = req.__('main_page.instructions.link_on');

	mobileDownload = mobileDownload.replace(mobileDownloadLink, '<a href="https://itunes.apple.com/us/app/ibm-iot-for-electronics/id1103404928" target="_blank">' + mobileDownloadLink + '</a>');
	mobileInstructions = mobileInstructions.replace(mobileInstructionsLink, '<a href="https://new-console.stage1.ng.bluemix.net/docs/starters/IotElectronics/iotelectronics_overview.html#iotforelectronics_getmobileapp" target="_blank">' + mobileInstructionsLink + '</a>');

	res.render('index', {
		platformDashboard: platformDashboard,
		mobileDownload: mobileDownload,
		mobileInstructions: mobileInstructions
	});
});

router.get('/contact', function(req, res) {
  res.render('contactForm');
});

router.get('/appEnv', function(req, res) {
  res.json(appEnv);
});

router.post('/contact', function(req, res){
	var body = JSON.parse(JSON.stringify(req.body));

	var country = body['country'];
	var firstName = body['firstName'];
	var lastName = body['lastName'];
	var email = body['email'];
	var phone = body['phone'];
	var company = body['company'];
	var message = body['interest'];

	var mailBody = '';

	mailBody  = ['<strong>', 'Country:', '</strong> ', country].join('');
	mailBody += ['<br>', '<strong>', 'First Name:', '</strong> ', firstName].join('');
	mailBody += ['<br>', '<strong>', 'Last Name:', '</strong> ', lastName].join('');
	mailBody += ['<br>', '<strong>', 'E-mail:', '</strong> ', email].join('');
	mailBody += ['<br>', '<strong>', 'Phone:', '</strong> ', phone].join('');
	mailBody += ['<br>', '<strong>', 'Company:', '</strong> ', company].join('');

	if(message != undefined && message != null && message != "")
		mailBody += ['<br>', '<br>', '<strong>', 'Message:', '</strong> ', message].join('');

	var from_email = new helper.Email(email);
	var to_email = new helper.Email('danilol@br.ibm.com');
	var subject = 'Subject Test';
	var content = new helper.Content('text/html', mailBody);
	var mail = new helper.Mail(from_email, subject, to_email, content);

	var request = sendgrid.emptyRequest({
	  method: 'POST',
	  path: '/v3/mail/send',
	  body: mail.toJSON(),
	});
	 
	sendgrid.API(request, function(error, response){
	  if(!error){
	  	res.send();
	  } else {
	  	res.status(500).send(error);
	  }
	});
});

module.exports = router;