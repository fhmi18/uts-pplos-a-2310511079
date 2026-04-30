<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');

$routes->group('api', static function ($routes) {
    $routes->get('property/health', 'Property::health');

    // Facilities endpoints
    $routes->get('facilities', 'Facility::index');
    $routes->post('facilities', 'Facility::create');
    $routes->get('facilities/(:num)', 'Facility::show/$1');

    // Property endpoints
    $routes->get('property', 'Property::index');
    $routes->post('property', 'Property::create');

    // Room endpoints (nested under property)
    $routes->get('property/(:num)/rooms', 'Room::index/$1');
    $routes->post('property/(:num)/rooms', 'Room::create/$1');
    $routes->get('property/(:num)/rooms/(:num)', 'Room::show/$1/$2');
    $routes->put('property/(:num)/rooms/(:num)', 'Room::update/$1/$2');
    $routes->delete('property/(:num)/rooms/(:num)', 'Room::delete/$1/$2');

    // Room facilities endpoints (nested under room)
    $routes->get('property/(:num)/rooms/(:num)/facilities', 'RoomFacility::index/$1/$2');
    $routes->post('property/(:num)/rooms/(:num)/facilities', 'RoomFacility::create/$1/$2');
    $routes->delete('property/(:num)/rooms/(:num)/facilities/(:num)', 'RoomFacility::delete/$1/$2/$3');

    // Property detail endpoints (MUST BE AFTER nested routes)
    $routes->get('property/(:num)', 'Property::show/$1');
    $routes->put('property/(:num)', 'Property::update/$1');
    $routes->delete('property/(:num)', 'Property::delete/$1');
});

