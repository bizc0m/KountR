import test from 'node:test';
import assert from 'node:assert/strict';
import '../docs/assets/counter-v2.js';
const V=globalThis.CounterV2;
test('Incréments décimaux précis et limites inclusives',()=>{
 const t={step:.1,bipoMin:0,bipoMax:1,bipoType:'count'};
 assert.equal(V.shifted(t,.2,1),.3);assert.equal(V.shifted(t,.1,-1),0);
 assert.equal(V.shifted(t,0,-1),null);assert.equal(V.shifted(t,1,1),null);
 assert.equal(V.shifted(t,null,1),.1);assert.equal(V.shifted(t,1,0),null);
 assert.equal(V.shifted({...t,bipoType:'med'},0,1),null);
});
test('Réordonner conserve tous les identifiants, les places vides et le tableau original',()=>{
 const initial=['a',null,'b','c'];assert.deepEqual(V.reordered(initial,'a','c'),[null,'b','c','a']);
 assert.deepEqual(V.reordered(initial,'c','a'),['c','a',null,'b']);
 assert.deepEqual(initial,['a',null,'b','c']);assert.deepEqual(V.reordered(initial,'absent','b'),initial);
});
test('Chronomètre : reprise après fermeture, pause et conversion des trois unités',()=>{
 const running={elapsedMs:2000,startedAt:10000};assert.equal(V.elapsed(running,13000),5000);
 assert.equal(V.elapsed({elapsedMs:5000,startedAt:null},20000),5000);
 assert.equal(V.elapsed(null,20000),0);assert.equal(V.elapsed(running,9000),2000);
 assert.equal(V.durationValue(90000,'min'),1.5);assert.equal(V.durationValue(90000,'s'),90);
 assert.equal(V.durationValue(5400000,'h'),1.5);assert.equal(V.unitOf({name:'Sommeil (h)'}),'h');
 assert.equal(V.unitOf({name:'Durée',unit:'min'}),'min');assert.equal(V.unitOf({name:'Douleur'}),null);
});
