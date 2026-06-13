<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Place extends Model
{
    protected $table = 'places';
    public $timestamps = false;

    protected $fillable = [
        'geoname_id', 'name', 'ascii_name', 'alternate_names',
        'lat', 'lng', 'feature_class', 'feature_code',
        'state_code', 'state', 'lga', 'population', 'full_address',
    ];
}
