import { generatePkce, getAntigravityAuthUrl, ANTIGRAVITY_MODELS, GEMINI_API_MODELS, ANTIGRAVITY_CLIENT_ID } from '../src/lib/antigravity.ts';
import assert from 'node:assert';

console.log('Running verification tests for providers & auth...');

const { verifier, challenge } = await generatePkce();
assert(typeof verifier === 'string' && verifier.length > 0, 'verifier must be a non-empty string');
assert(typeof challenge === 'string' && challenge.length > 0, 'challenge must be a non-empty string');
console.log('PKCE generation passed');

const redirectUri = 'http://localhost:3000/api/auth/google/callback';
const authUrl = getAntigravityAuthUrl(redirectUri, challenge, verifier);
assert(typeof authUrl === 'string' && authUrl.length > 0, 'authUrl must be a non-empty string');
assert(authUrl.includes(`client_id=${ANTIGRAVITY_CLIENT_ID}`), 'authUrl must contain client_id');
assert(authUrl.includes(`code_challenge=${challenge}`), 'authUrl must contain code_challenge');
assert(authUrl.includes('scope='), 'authUrl must contain scope');
console.log('Auth URL generation passed');

const antigravityIds = ANTIGRAVITY_MODELS.map(m => m.id);
assert(antigravityIds.includes('gemini-3.7-flash'), 'ANTIGRAVITY_MODELS must include gemini-3.7-flash');
assert(antigravityIds.includes('gemini-3.5-flash'), 'ANTIGRAVITY_MODELS must include gemini-3.5-flash');
assert(antigravityIds.includes('gemini-3-pro'), 'ANTIGRAVITY_MODELS must include gemini-3-pro');
assert(antigravityIds.includes('gemini-3.1-pro'), 'ANTIGRAVITY_MODELS must include gemini-3.1-pro');
assert(antigravityIds.includes('antigravity-claude-opus-4-6-thinking'), 'ANTIGRAVITY_MODELS must include antigravity-claude-opus-4-6-thinking');
console.log('Antigravity models check passed');

const geminiApiIds = GEMINI_API_MODELS.map(m => m.id);
assert(geminiApiIds.includes('gemini-2.0-flash'), 'GEMINI_API_MODELS must include gemini-2.0-flash');
assert(geminiApiIds.includes('gemini-2.0-flash-thinking-exp'), 'GEMINI_API_MODELS must include gemini-2.0-flash-thinking-exp');
assert(geminiApiIds.includes('gemini-2.0-pro-exp-02-05'), 'GEMINI_API_MODELS must include gemini-2.0-pro-exp-02-05');
assert(geminiApiIds.includes('gemini-1.5-flash'), 'GEMINI_API_MODELS must include gemini-1.5-flash');
assert(geminiApiIds.includes('gemini-1.5-pro'), 'GEMINI_API_MODELS must include gemini-1.5-pro');
console.log('Gemini API models check passed');

console.log('All provider assertions passed successfully!');
