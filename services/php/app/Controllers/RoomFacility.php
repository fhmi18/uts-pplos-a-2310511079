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

    public function index($propertyId = null, $roomId = null)
    {
        try {
            if ($propertyId === null || $roomId === null) {
                return $this->fail('Property ID and Room ID are required', 400);
            }

            $room = $this->roomModel->getRoomByIdAndProperty($roomId, $propertyId);
            if (!$room) {
                return $this->failNotFound('Room not found in this property');
            }

            $facilities = $this->roomFacilityModel->getRoomFacilities($roomId);

            return $this->respond([
                'status' => 'success',
                'message' => 'Room facilities retrieved successfully',
                'data' => $facilities,
            ], 200);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function create($propertyId = null, $roomId = null)
    {
        try {
            $token = $this->getTokenFromHeader();
            $decoded = $this->verifyJWT($token);
            if (!$decoded || strtolower($decoded->role) !== 'owner') {
                return $this->fail('Unauthorized: Only owners can manage facilities', 401);
            }

            $property = $this->propertyModel->find($propertyId);
            if (!$property || $property['owner_id'] != $decoded->id) {
                return $this->failForbidden('You can only manage facilities in your own properties');
            }

            $data = $this->request->getJSON();
            if (empty($data->facility_id)) {
                return $this->fail('facility_id is required', 400);
            }

            $facility = $this->facilityModel->find($data->facility_id);
            if (!$facility) {
                return $this->failNotFound('Master facility not found');
            }

            $result = $this->roomFacilityModel->addFacility($roomId, $data->facility_id);

            if (!$result) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Facility already exists in this room or failed to add',
                ], 400);
            }

            $currentFacilities = $this->roomFacilityModel->getRoomFacilities($roomId);

            return $this->respond([
                'status' => 'success',
                'message' => 'Facility successfully added to room',
                'data' => $currentFacilities,
            ], 201);

        } catch (\Exception $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    protected function getTokenFromHeader()
    {
        $header = $this->request->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(.+)/', $header, $matches)) {
            return $matches[1];
        }
        return null;
    }

    protected function verifyJWT($token)
    {
        if (!$token)
            return null;
        try {
            $secret = getenv('JWT_SECRET');
            $parts = explode('.', $token);
            if (count($parts) !== 3)
                return null;

            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])));
            if (isset($payload->exp) && $payload->exp < time())
                return null;

            return $payload;
        } catch (\Exception $e) {
            return null;
        }
    }
}