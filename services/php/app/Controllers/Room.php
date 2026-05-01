<?php

namespace App\Controllers;

use CodeIgniter\API\ResponseTrait;
use App\Models\PropertyModel;
use App\Models\RoomModel;
use App\Models\RoomFacilityModel;

class Room extends BaseAPIController
{
    use ResponseTrait;

    protected $format = 'json';
    protected $propertyModel;
    protected $roomModel;
    protected $roomFacilityModel;

    public function __construct()
    {
        $this->propertyModel = new PropertyModel();
        $this->roomModel = new RoomModel();
        $this->roomFacilityModel = new RoomFacilityModel();
    }

    // GET /api/property/{propertyId}/rooms - List all rooms
    public function index($propertyId = null)
    {
        try {
            if ($propertyId === null) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property ID is required',
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

            $filters = [
                'limit' => (int) ($this->request->getVar('limit') ?? 10),
                'offset' => (int) ($this->request->getVar('offset') ?? 0),
            ];

            $status = $this->request->getVar('status');

            if (!empty($status)) {
                $filters['status'] = $status;
            }

            $result = $this->roomModel->getRoomsByProperty($propertyId, $filters);

            // Add facilities to each room
            foreach ($result['data'] as &$room) {
                $facilities = $this->roomFacilityModel->getRoomFacilities($room['id']);
                $room['facilities'] = $facilities;
            }

            return $this->respond([
                'status' => 'success',
                'message' => 'Rooms retrieved successfully',
                'data' => $result['data'],
                'pagination' => [
                    'total' => $result['total'],
                    'limit' => $result['limit'],
                    'offset' => $result['offset'],
                ],
            ], 200);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to retrieve rooms',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // GET /api/property/{propertyId}/rooms/{roomId}
    public function show($propertyId = null, $roomId = null)
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

            $room = $this->roomModel->getRoomByIdAndProperty($roomId, $propertyId);

            if (!$room) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Room not found',
                ], 404);
            }

            // Get associated facilities
            $facilities = $this->roomFacilityModel->getRoomFacilities($roomId);
            $room['facilities'] = $facilities;

            return $this->respond([
                'status' => 'success',
                'message' => 'Room retrieved successfully',
                'data' => $room,
            ], 200);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to retrieve room',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // POST /api/property/{propertyId}/rooms - Create room (Protected - Owner)
    public function create($propertyId = null)
    {
        try {
            if ($propertyId === null) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property ID is required',
                ], 400);
            }

            if (!$this->currentUser) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Unauthorized: Missing user information from gateway.',
                ], 401);
            }

            $hasOwnerRole = isset($this->currentUser->role) && strtolower($this->currentUser->role) === 'owner';
            if (!$hasOwnerRole) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Only owners can create rooms',
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

            if ($property['owner_id'] != $this->currentUser->id) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'You can only manage rooms in your own properties',
                ], 403);
            }

            $data = $this->request->getJSON();

            if (empty($data->room_number) || empty($data->price_per_month)) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'room_number and price_per_month are required',
                ], 400);
            }

            $roomData = [
                'property_id' => $propertyId,
                'room_number' => $data->room_number,
                'price_per_month' => (float) $data->price_per_month,
                'description' => $data->description ?? null,
                'status' => $data->status ?? 'available',
                'capacity' => isset($data->capacity) ? (int) $data->capacity : 1,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];

            $roomId = $this->roomModel->insert($roomData);

            if (!$roomId) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Failed to create room',
                    'errors' => $this->roomModel->errors(),
                ], 400);
            }

            $room = $this->roomModel->find($roomId);

            // Get associated facilities
            $facilities = $this->roomFacilityModel->getRoomFacilities($roomId);
            $room['facilities'] = $facilities;

            return $this->respond([
                'status' => 'success',
                'message' => 'Room created successfully',
                'data' => $room,
            ], 201);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to create room',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // PUT /api/property/{propertyId}/rooms/{roomId} - Update room (Protected - Owner)
    public function update($propertyId = null, $roomId = null)
    {
        try {
            if ($propertyId === null || $roomId === null) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property ID and Room ID are required',
                ], 400);
            }

            if (!$this->currentUser) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Unauthorized: Missing user information from gateway.',
                ], 401);
            }

            $hasOwnerRole = isset($this->currentUser->role) && strtolower($this->currentUser->role) === 'owner';
            if (!$hasOwnerRole) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Only owners can update rooms',
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

            if ($property['owner_id'] != $this->currentUser->id) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'You can only manage rooms in your own properties',
                ], 403);
            }

            // Check if room exists and belongs to this property
            $room = $this->roomModel->getRoomByIdAndProperty($roomId, $propertyId);
            if (!$room) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Room not found',
                ], 404);
            }

            $data = $this->request->getJSON();
            $updateData = [];

            if (isset($data->room_number)) {
                $updateData['room_number'] = $data->room_number;
            }

            if (isset($data->price_per_month)) {
                $updateData['price_per_month'] = (float) $data->price_per_month;
            }

            if (isset($data->capacity)) {
                $updateData['capacity'] = (int) $data->capacity;
            }

            if (isset($data->description)) {
                $updateData['description'] = $data->description;
            }

            if (isset($data->status)) {
                $updateData['status'] = $data->status;
            }

            if (empty($updateData)) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'No fields to update',
                ], 400);
            }

            $updateData['updated_at'] = date('Y-m-d H:i:s');

            $this->roomModel->update($roomId, $updateData);
            $updatedRoom = $this->roomModel->find($roomId);

            // Get associated facilities
            $facilities = $this->roomFacilityModel->getRoomFacilities($roomId);
            $updatedRoom['facilities'] = $facilities;

            return $this->respond([
                'status' => 'success',
                'message' => 'Room updated successfully',
                'data' => $updatedRoom,
            ], 200);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to update room',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // DELETE /api/property/{propertyId}/rooms/{roomId} - Delete room (Protected - Owner)
    public function delete($propertyId = null, $roomId = null)
    {
        try {
            if ($propertyId === null || $roomId === null) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property ID and Room ID are required',
                ], 400);
            }

            if (!$this->currentUser) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Unauthorized: Missing user information from gateway.',
                ], 401);
            }

            $hasOwnerRole = isset($this->currentUser->role) && strtolower($this->currentUser->role) === 'owner';
            if (!$hasOwnerRole) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Only owners can delete rooms',
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

            if ($property['owner_id'] != $this->currentUser->id) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'You can only manage rooms in your own properties',
                ], 403);
            }

            // Check if room exists
            $room = $this->roomModel->getRoomByIdAndProperty($roomId, $propertyId);
            if (!$room) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Room not found',
                ], 404);
            }

            $this->roomModel->delete($roomId);

            return $this->respond([
                'status' => 'success',
                'message' => 'Room deleted successfully',
            ], 200);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to delete room',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
