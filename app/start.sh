export VCAP_SERVICES='{"user-provided":[{"name":"Redis_UPS","label":"user-provided","credentials":{"password":"BEPNGNVTVZNXHTHC","port":"26322",  "host" : "bluemix-sandbox-dal-9-portal.7.dblayer.com"}}],"cloudantNoSQLDB":[{"name":"RES_CACHE","label":"cloudantNoSQLDB","plan":"Shared","credentials":{"username":"7b155b37-97c8-4d6b-9bf9-b11d2ea4ba0f-bluemix","password":"a42258aa92bf7f5830b84e5f7109e8276965af200696ff72fcfc46da2b0b4d6c","host":"7b155b37-97c8-4d6b-9bf9-b11d2ea4ba0f-bluemix.cloudant.com","port":443,"url":"https://7b155b37-97c8-4d6b-9bf9-b11d2ea4ba0f-bluemix:a42258aa92bf7f5830b84e5f7109e8276965af200696ff72fcfc46da2b0b4d6c@7b155b37-97c8-4d6b-9bf9-b11d2ea4ba0f-bluemix.cloudant.com"}}]}'
export SESSION_CACHENAME='Redis_UPS'
export sessionCacheName='Redis_UPS'
export RESILIENCY_CACHENAME='RES_CACHE'
export sessionKey='opsConsole.sid'
export SESSION_SECRET='5461697E8FF2D5C596A72316DA3B451D'
export sessionSecret='5461697E8FF2D5C596A72316DA3B451D'
export uaaClientId='console'
export uaaClientSecret='ENLncnkDv3'
export uaaCallbackUrl='https://dev-console.stage1.ng.bluemix.net/login/callback'
export UAA_CLIENT_ID='console'
export UAA_CLIENT_SECRET='ENLncnkDv3'
export UAA_CALLBACK_URL='https://dev-console.stage1.ng.bluemix.net/login/callback'
export LOG4JS_LEVEL=DEBUG
export BLUEMIX_HOST='stage1.ng.bluemix.net'
export bluemixHost='stage1.ng.bluemix.net'
export PROXY_OUTER_URL=true
export ACE_alternateConsoleHost="https://console.stage1.ng.bluemix.net/"
export ACE_onboardConsoleHost="console"
export ACE_onboardAlternateHost="new-console"
export ACE_bssrClientId='acebssr'
export ACE_bssrClientSecret='VQLrHpJn46DsAuRY'
export ACE_adminClientSecret='foobar'
export ACE_adminClientId='jtace'
export bssrClientId='acebssr'
export bssrClientSecret='VQLrHpJn46DsAuRY'

## IAM stuff
export iamClientId='hkk2OjMgTg'
export iamClientSecret='FjuBZjRaqk'
export iamCookieClientId='hkk2OjMgTg'
export iamUIApiKey='AXQWqNyUeMDym9VnfBm4pS9x0vatACYGYKu89VZtO90='
export iamTokenUrl="https://iam.stage1.ng.bluemix.net/oidc/token"

npm start
