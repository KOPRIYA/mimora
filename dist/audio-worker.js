import {analyzeSamples} from './core.js';
self.onmessage=e=>{try{self.postMessage(analyzeSamples(e.data.samples,e.data.sampleRate));}catch(error){self.postMessage({error:error.message});}};
