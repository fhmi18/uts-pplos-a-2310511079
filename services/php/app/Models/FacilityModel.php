<?php

namespace App\Models;

use CodeIgniter\Model;

class FacilityModel extends Model
{
    protected $table = 'facilities';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'name',
        'description',
        'icon',
    ];

    protected $useTimestamps = false;

    /**
     * Get all facilities with optional search
     */
    public function getAllFacilities($search = null)
    {
        $builder = $this->builder();

        if (!empty($search)) {
            $builder->like('name', $search);
            $builder->orLike('description', $search);
        }

        return $builder->orderBy('name', 'ASC')->get()->getResultArray();
    }
}
