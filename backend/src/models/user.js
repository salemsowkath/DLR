class User {
  constructor({
    id,
    external_reference,
    name,
    email_hash = null,
    phone_token = null,
    password_hash = null,
    date_of_birth = null,
    gender = null,
    state = null,
    state_id = null,
    district = null,
    district_id = null,
    taluk = null,
    village = null,
    pincode = null,
    status = 'ACTIVE',
    created_at = new Date().toISOString(),
    updated_at = new Date().toISOString(),
    roles = [],
    identity_verified = true,
    username = null,
    email = null,
    department = null,
  }) {
    this.id = id;
    this.external_reference = external_reference;
    this.name = name;
    this.username = username || external_reference;
    this.email = email;
    this.department = department;
    this.email_hash = email_hash;
    this.phone_token = phone_token;
    this.password_hash = password_hash;
    this.date_of_birth = date_of_birth;
    this.gender = gender;
    this.state = state;
    this.state_id = state_id;
    this.district = district;
    this.district_id = district_id;
    this.taluk = taluk;
    this.village = village;
    this.pincode = pincode;
    this.status = status;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.roles = Array.isArray(roles) ? roles : [roles];
    this.identity_verified = identity_verified;
  }

  static store = new Map();

  toPublicJSON() {
    return {
      id: this.id,
      user_id: this.id,
      name: this.name,
      fullName: this.name,
      username: this.username,
      email: this.email,
      department: this.department,
      external_reference: this.external_reference,
      date_of_birth: this.date_of_birth,
      dateOfBirth: this.date_of_birth,
      gender: this.gender,
      state: this.state,
      state_id: this.state_id,
      district: this.district,
      district_id: this.district_id,
      taluk: this.taluk,
      village: this.village,
      pincode: this.pincode,
      status: this.status,
      roles: this.roles,
      role: this.roles[0] || 'CITIZEN',
      primary_role: this.roles[0] || 'CITIZEN',
      identityVerified: Boolean(this.identity_verified),
      identity_verified: Boolean(this.identity_verified),
      created_at: this.created_at,
    };
  }
}

module.exports = User;
