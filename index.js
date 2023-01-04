const https = require('node:https');
const fs = require('node:fs');
const zlib = require('node:zlib');
const util = require('node:util');

const options = {
	key: fs.readFileSync('riot.key'),
	cert: fs.readFileSync('riot.crt')
};

const riotResponseBuilder = obj => {
	let riotRes = null;

	if (Array.isArray(obj)) {
		riotRes = [];

		obj.forEach((value, index) => riotRes[index] = typeof value === 'object' ? riotResponseBuilder(value) : value);
	} else {
		riotRes = {};

		for (const [key, value] of Object.entries(obj)) {
			if (typeof key === 'string') {
				const keys = key.split('.');
				let subRes = riotRes;

				keys.forEach((_key, index) => {
					if (index === keys.length - 1) {
						subRes[_key] = typeof value === 'object' ? riotResponseBuilder(value) : value;
					} else {
						if (!subRes[_key])
						subRes[_key] = {};

						subRes = subRes[_key];
					}
				});
			} else {
				riotRes[key] = typeof value === 'object' ? riotResponseBuilder(value) : value;
			}
		}
	}

	return riotRes;
}

const handlers = {
	'data.riotgames.com': {}, // is the endpoint for Riot Games data collection (i.e. game metrics)
	'auth.riotgames.com': { // 'auth.riotgames.com' is the endpoint for Riot Games authentication services
		'/.well-known/openid-configuration': (req, res) => {
			const body = '{"request_object_encryption_alg_values_supported":[],"dpop_signing_alg_values_supported":["ES256K","PS384","ES384","RS384","ES256","RS256","ES512","PS256","PS512","RS512"],"acr_values_supported":["0","urn:riot:bronze","urn:riot:silver","urn:riot:gold","urn:riot:parents"],"token_endpoint_auth_signing_alg_values_supported":["RS256","RS384","RS512","HS256","HS384","HS512","ES256","ES384","ES512"],"response_modes_supported":["query","fragment"],"end_session_endpoint":"https://auth.riotgames.com/logout","request_object_encryption_enc_values_supported":[],"jwks_uri":"https://auth.riotgames.com/jwks.json","check_session_iframe":"https://auth.riotgames.com/check-session-iframe","riot_recaptcha_public_key":"6LcGEv8SAAAAAPUTwLPaiMfnJNfedmGj4oww8ITT","claim_types_supported":["normal"],"grant_types_supported":["implicit","authorization_code","refresh_token","password","client_credentials"],"claims_supported":["sub","iss","auth_time","acr","name"],"id_token_encryption_alg_values_supported":["RSA-OAEP","RSA-OAEP-256","dir","ECDH-ES","ECDH-ES+A128KW","ECDH-ES+A192KW","ECDH-ES+A256KW"],"request_parameter_supported":true,"id_token_encryption_enc_values_supported":["A128CBC-HS256","A256GCM"],"userinfo_encryption_alg_values_supported":["RSA-OAEP","RSA-OAEP-256","dir","ECDH-ES","ECDH-ES+A128KW","ECDH-ES+A192KW","ECDH-ES+A256KW"],"response_types_supported":["code","token","id_token","id_token token","code id_token","code id_token token"],"authorization_encryption_alg_values_supported":["RSA-OAEP-256","ECDH-ES","ECDH-ES+A128KW","ECDH-ES+A192KW","ECDH-ES+A256KW","dir"],"riot_theme_values_supported":["lol","lor","valorant"],"authorization_response_iss_parameter_supported":true,"userinfo_encryption_enc_values_supported":["A128CBC-HS256","A256GCM"],"authorization_encryption_enc_values_supported":["A128CBC-HS256","A192CBC-HS384","A256CBC-HS512","A128GCM","A192GCM","A256GCM"],"riot_amr_values_supported":["cookie","password","captcha","mfa","game_center","google_auth","facebook","apple"],"scopes_supported":["openid","profile","email","lol","summoner"],"token_endpoint_auth_methods_supported":["client_secret_basic","client_secret_post","client_secret_jwt","private_key_jwt","self_signed_tls_client_auth","none"],"display_values_supported":["page","touch"],"claims_parameter_supported":true,"pushed_authorization_request_endpoint":"https://auth.riotgames.com/par","code_challenge_methods_supported":["plain","S256"],"backchannel_logout_session_supported":true,"userinfo_signing_alg_values_supported":["RS256","RS384","RS512","ES256","ES384","ES512"],"riot_lol_userinfo_regions_enabled":["PBE1","OC1","JP1","KR","BR1","LA1","LA2","NA1","EUN1","EUW1","RU","TR1"],"authorization_signing_alg_values_supported":["RS256","RS384","RS512","ES256","ES384","ES512"],"request_uri_quota":10,"frontchannel_logout_session_supported":true,"request_uri_parameter_supported":true,"riot_lol_regions_disabled":[],"riot_lol_regions_supported":["BR1","EUN1","EUW1","JP1","KR","LA1","LA2","NA1","OC1","PBE1","RU","TR1"],"subject_types_supported":["public","pairwise"],"revocation_endpoint":"https://auth.riotgames.com/token/revoke","id_token_signing_alg_values_supported":["RS256","RS384","RS512","ES256","ES384","ES512"],"issuer":"https://auth.riotgames.com","userinfo_endpoint":"https://auth.riotgames.com/userinfo","token_endpoint":"https://auth.riotgames.com/token","authorization_endpoint":"https://auth.riotgames.com/authorize","tls_client_certificate_bound_access_tokens":true,"backchannel_logout_supported":true,"ui_locales_supported":["en","cs","de","el","es","es-419","fr","hu","it","ms","pl","pt-BR","ro","ru","tr","ja","ko","id","th","vi","zh-Hans","zh-Hant","ar"],"request_object_signing_alg_values_supported":["RS256","RS384","RS512","ES256","ES384","ES512"],"frontchannel_logout_supported":true,"riot_partner_auth_config":{"facebook":{"permissions":["public_profile","email"]},"google_auth":{"clientId":"187685766663-ct6bdnthcq6jlllecpg1guhthoc7i8vv.apps.googleusercontent.com"}}}';

			const compressing = req.headers['accept-encoding'] ? req.headers['accept-encoding'].includes('gzip') : false;

			const cb = body => {
				const headers = {};
				headers['content-type'] = 'application/json; charset=utf-8';
				headers['content-length'] = Buffer.byteLength(body);
				headers['Connection'] = 'keep-alive';
				headers['etag'] = 'W/"f8b-njFqhvPZkA2GPa5A/f+GqAMuq9U"';
				headers['vary'] = 'Accept-Encoding';
				headers['x-content-type-options'] = 'nosniff';
				headers['x-download-options'] = 'noopen';
				headers['Accept-Ranges'] = 'bytes';
				headers['X-RiotGames-CDN'] = 'Cloudflare';
				headers['Server'] = 'cloudflare';

				if (compressing)
					headers['content-encoding'] = 'gzip';

				res.writeHead(200, headers).end(body);
			}

			if (compressing) {
				zlib.gzip(body, (err, buffer) => {
					if (err) throw err;
					cb(buffer)
				});
			} else {
				cb(body);
			}
		}
	}
}

const responseHandlers = {
	'clientconfig.rpg.riotgames.com': {
		'/api/v1/config/public': (req, res) => {
			const jsonBody = JSON.parse(res.body);
			//console.log(jsonBody);
			return res
		},
		'/api/v1/config/player': (req, res) => {
			const jsonBody = JSON.parse(res.body);

			const riotRes = riotResponseBuilder(jsonBody);

			delete riotRes['payments'];
			delete riotRes['chat'];
			delete riotRes['lol'];
			delete riotRes['rms'];

			if (riotRes['keystone']) {
				delete riotRes['keystone']['ga-warning'];
				delete riotRes['keystone']['loyalty']['config']['league_of_legends'];
				delete riotRes['keystone']['loyalty']['config']['league_of_legends_game'];
			}

			//console.log(util.inspect(riotRes, { showHidden: false, depth: null, colors: true }));

			jsonBody['keystone.client.feature_flags.chrome_devtools.enabled'] = true;

			res.body = JSON.stringify(jsonBody);
			return res
		},
	}
}

const requestUpstream = options => {
	return new Promise((resolve, reject) => {
		const cb = body => {
			const headers = { ...options.headers };

			if (body) {
				headers['content-length'] = Buffer.byteLength(body);
			} else {
				delete headers['content-length'];
			}

			const upReq = https.request({
				hostname: options.hostname,
				path: options.path,
				method: options.method,
				headers: headers
			}, upRes => {
				const buffers = [];

				upRes.on('data', chunk => {
					buffers.push(chunk);
				}).on('end', () => {
					const cb = body => {
						resolve({
							statusCode: upRes.statusCode,
							statusMessage: upRes.statusMessage,
							headers: upRes.headers,
							body: body
						});
					}

					if (upRes.statusCode >= 200 && upRes.statusCode < 300) {
						const buffer = Buffer.concat(buffers);
						const compressing = upRes.headers['content-encoding'] ? upRes.headers['content-encoding'].includes('gzip') : false;

						if (compressing) {
							zlib.gunzip(buffer, (err, dezipped) => {
								if (err) {
									reject(err);
									return;
								};

								cb(dezipped.toString('utf-8'));
							});
						} else {
							cb(buffer.toString('utf-8'));
						}
					} else {
						reject({ code: upRes.statusCode, message: upRes.statusMessage });
					}
				});
			});

			upReq.on('error', reject);
			upReq.end(body);
		}

		if (options.body !== undefined && options.body !== null) {
			const compressing = options.headers['content-encoding'] ? options.headers['content-encoding'].includes('gzip') : false;

			if (compressing) {
				zlib.gzip(options.body, (err, buffer) => {
					if (err) {
						reject(err);
						return;
					};

					cb(buffer);
				});
			} else {
				cb(options.body);
			}
		} else {
			cb();
		}
	});
}

const AuthorizedUAs = [
	'RiotClient',
	'RiotNetwork',
	'ShooterGame'
]

const app = async (req, res) => {
	const headers = req.headers;

	console.log(req.url + ' - ' + req.method);
	console.log(headers);

	if (!headers['user-agent'] || AuthorizedUAs.findIndex(e => headers['user-agent'].includes(e)) === -1) {
		res.writeHead(403).end();
		return;
	};

	const url = new URL(req.url, `https://${headers.host}`);

	if (req.method === 'GET') {
		if (handlers[url.hostname]?.[url.pathname]) {
			handlers[url.hostname][url.pathname](req, res);
		} else {
			await requestUpstream({
				hostname: url.hostname,
				path: url.pathname + url.search,
				method: req.method,
				headers: req.headers
			}).then(upRes => {
				console.log(`UPSTREAM STATUS ${upRes.statusCode}`);

				if (responseHandlers[url.hostname]?.[url.pathname])
					upRes = responseHandlers[url.hostname][url.pathname](req, upRes);

				const cb = body => {
					const headers = upRes.headers;
					headers['content-length'] = Buffer.byteLength(body);
					res.writeHead(upRes.statusCode, upRes.headers).end(body);
				}

				const compressing = upRes.headers['content-encoding'] ? upRes.headers['content-encoding'].includes('gzip') : false;

				if (compressing) {
					zlib.gzip(upRes.body, (err, buffer) => {
						if (err) throw err;
						cb(buffer);
					});
				} else {
					cb(upRes.body);
				}
			}).catch(console.error);
		}
	} else if (req.method === 'POST') {
		const buffers = [];
		let buffersByteLength = 0;

		req.on('data', chunk => {
			buffers.push(chunk);
			buffersByteLength += Buffer.byteLength(chunk);

			// Too much POST data, kill the connection!
			// 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
			if (buffersByteLength > 1e6)
				req.destroy();
		}).on('end', async () => {
			const cb = async body => {
				console.log(body);

				if (handlers[url.hostname]?.[url.pathname]) {
					handlers[url.hostname][url.pathname](req, res, body);
				} else {
					await requestUpstream({
						hostname: url.hostname,
						path: url.pathname + url.search,
						method: req.method,
						headers: req.headers,
						body: body
					}).then(upRes => {
						console.log(`UPSTREAM POST STATUS ${upRes.statusCode}`);
						console.log(`UPSTREAM POST BODY`, upRes.body);

						if (responseHandlers[url.hostname]?.[url.pathname])
							upRes = responseHandlers[url.hostname][url.pathname](req, upRes);

						const cb = body => {
							const headers = upRes.headers;
							headers['content-length'] = Buffer.byteLength(body);
							res.writeHead(upRes.statusCode, upRes.headers).end(body);
						}

						const compressing = upRes.headers['content-encoding'] ? upRes.headers['content-encoding'].includes('gzip') : false;

						if (compressing) {
							zlib.gzip(upRes.body, (err, buffer) => {
								if (err) throw err;
								cb(buffer);
							});
						} else {
							cb(upRes.body);
						}
					}).catch(console.error);
				}
			}

			const buffer = Buffer.concat(buffers);
			const compressing = headers['content-encoding'] ? headers['content-encoding'].includes('gzip') : false;

			if (compressing) {
				zlib.gunzip(buffer, (err, dezipped) => {
					if (err) throw err;
					cb(dezipped.toString('utf-8'));
				});
			} else {
				cb(buffer.toString('utf-8'));
			}
		});
	}
};

// Create an HTTP service.
//http.createServer(app).listen(80);

// Create an HTTPS service identical to the HTTP service.
const server = https.createServer(options, app)

server.on('clientError', (e, socket) => { console.error(e); });
server.on('tlsClientError', (e, socket) => { console.error(e); });

server.listen(443);