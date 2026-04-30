<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');

$routes->group('api', static function ($routes) {
    $routes->get('property/health', 'Property::health');

    $routes->get('property', 'Property::index');
    $routes->post('property', 'Property::create');
    $routes->get('property/(:num)', 'Property::show/$1');
    $routes->put('property/(:num)', 'Property::update/$1');
    $routes->delete('property/(:num)', 'Property::delete/$1');
});

