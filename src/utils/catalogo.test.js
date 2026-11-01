import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrarProductos } from './catalogo.js';
const products = [{nombre:'Edición Ámbar',categoria:'Estudio',disponible:true},{nombre:'Origen',categoria:'Botánica',disponible:false}];
test('Búsqueda sin distinción de acentos, mayúsculas ni espacios externos',()=>assert.equal(filtrarProductos(products,' AMBAR ','Todas','Todos').length,1));
test('Combina nombre, categoría y disponibilidad',()=>{assert.equal(filtrarProductos(products,'','Botánica','Agotado').length,1);assert.equal(filtrarProductos(products,'Origen','Botánica','Disponible').length,0);});
test('Catálogo vacío y consulta sin coincidencias',()=>{assert.deepEqual(filtrarProductos([],'','Todas','Todos'),[]);assert.deepEqual(filtrarProductos(products,'inexistente','Todas','Todos'),[]);});
