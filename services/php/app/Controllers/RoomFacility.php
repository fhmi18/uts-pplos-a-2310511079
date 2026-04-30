<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\PropertyModel;
use App\Models\RoomModel;
use App\Models\RoomFacilityModel;
use App\Models\FacilityModel;

class RoomFacility extends ResourceController
{
    use ResponseTrait;

    protected $format = 'json';
    protected $propertyModel;
    protected $roomModel;
    protected $roomFacilityModel;
    protected $facilityModel;

    public function __construct()
    {
        $this->propertyModel = new PropertyModel();
        $this->roomModel = new RoomModel();
        $this->roomFacilityModel = new RoomFacilityModel();
        $this->facilityModel = new FacilityModel();
    }

    /**
     * GET /api/property/{propertyId}/rooms/{roomId}/facilities - Get all facilities for a room
     */
    public function index($propertyId = null, $roomId = null)
    {
        try {
            if ($propertyId === null || $roomId === null) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property ID and Room ID are required',
                ], 400);
            }

            // Check if property exists
            $property = $this->propertyModel->find($propertyId);
            if (!$property) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property not found',
                ], 404);
            }

            // Check if room exists in property
            $room = $this->roomModel->getRoomByIdAndProperty($roomId, $propertyId);
            if (!$room) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Room not found',
                ], 404);
            }

            $facilities = $this->roomFacilityModel->getRoomFacilities($roomId);

            return $this->respond([
                'status' => 'success',
                'message' => 'Room facilities retrieved successfully',
                'data' => $facilities,
            ], 200);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to retrieve room facilities',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/property/{propertyId}/rooms/{roomId}/facilities - Add facility to room (Protected - Owner)
     */
    public function create($propertyId = null, $roomId = null)
    {
        try {
            if ($propertyId === null || $roomId === null) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property ID and Room ID are required',
                ], 400);
            }

            $token = $this->getTokenFromHeader();
            if (!$token) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'No token provided',
                ], 401);
            }

            $decoded = $this->verifyJWT($token);
            if (!$decoded) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Invalid or expired token',
                ], 401);
            }

            $hasOwnerRole = isset($decoded->role) && strtolower($decoded->role) === 'owner';
            if (!$hasOwnerRole) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Only owners can manage room facilities',
                ], 403);
            }

            // Check if property exists and belongs to user
            $property = $this->propertyModel->find($propertyId);
            if (!$property) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property not found',
                ], 404);
            }

            if ($property['owner_id'] != $decoded->id) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'You can only manage facilities in your own properties',
                ], 403);
            }

            // Check if room exists in property
            $room = $this->roomModel->getRoomByIdAndProperty($roomId, $propertyId);
            if (!$room) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Room not found',
                ], 404);
            }

            $data = $this->request->getJSON();

            if (empty($data->facility_id)) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'facility_id is required',
                ], 400);
            }

            // Check if facility exists
            $facility = $this->facilityModel->find($data->facility_id);
            if (!$facility) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Facility not found',
                ], 404);
            }

            // Check if facility already exists for this room
            if ($this->roomFacilityModel->facilityExistsForRoom($roomId, $data->facility_id)) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Facility already exists for this room',
                ], 400);
            }

            // Add facility to room
            $result = $this->roomFacilityModel->addFacility($roomId, $data->facility_id);

            if (!$result) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Failed to add facility to room',
                ], 500);
            }

            $facilities = $this->roomFacilityModel->getRoomFacilities($roomId);

            return $this->respond([
                'status' => 'success',
                'message' => 'Facility added to room successfully',
                'data' => $facilities,
            ], 201);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to add facility to room',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/property/{propertyId}/rooms/{roomId}/facilities/{facilityId} - Remove facility from room (Protected - Owner)
     */
    public function delete($propertyId = null, $roomId = null, $facilityId = null)
    {
        try {
            if ($propertyId === null || $roomId === null || $facilityId === null) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property ID, Room ID, and Facility ID are required',
                ], 400);
            }

            $token = $this->getTokenFromHeader();
            if (!$token) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'No token provided',
                ], 401);
            }

            $decoded = $this->verifyJWT($token);
            if (!$decoded) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Invalid or expired token',
                ], 401);
            }

            $hasOwnerRole = isset($decoded->role) && strtolower($decoded->role) === 'owner';
            if (!$hasOwnerRole) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Only owners can manage room facilities',
                ], 403);
            }

            // Check if property exists and belongs to user
            $property = $this->propertyModel->find($propertyId);
            if (!$property) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property not found',
                ], 404);
            }

            if ($property['owner_id'] != $decoded->id) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'You can only manage facilities in your own properties',
                ], 403);
            }

            // Check if room exists in property
            $room = $this->roomModel->getRoomByIdAndProperty($roomId, $propertyId);
            if (!$room) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Room not found',
                ], 404);
            }

            // Check if facility exists for this room
            if (!$this->roomFacilityModel->facilityExistsForRoom($roomId, $facilityId)) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Facility not found for this room',
                ], 404);
            }

            // Remove facility from room
            $this->roomFacilityModel->removeFacility($roomId, $facilityId);

            $facilities = $this->roomFacilityModel->getRoomFacilities($roomId);

            return $this->respond([
                'status' => 'success',
                'message' => 'Facility removed from room successfully',
                'data' => $facilities,
            ], 200);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to remove facility from room',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper: Extract token from Authorization header
     */
    protected function getTokenFromHeader()
    {
        $header = $this->request->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(.+)/', $header, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Helper: Verify JWT token
     */
    protected function verifyJWT($token)
    {
        $secret = 'UTS_SE-2_2026_A_2310511079';

        try {
            $decoded = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], explode('.', $token)[1])));

            if (!isset($decoded->exp) || $decoded->exp < time()) {
                return null;
            }

            return $decoded;
        } catch (\Exception $e) {
            return null;
        }
    }
}
