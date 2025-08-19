import type { Organization } from '../types/organization';

interface OrganizationDetailsProps {
  organization: Organization;
  onClose: () => void;
}

export default function OrganizationDetails({ organization, onClose }: OrganizationDetailsProps) {
  return (
    <div className="w-96 bg-white shadow-lg overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold text-gray-900">{organization.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {organization.category}
            </span>
          </div>

          <p className="text-gray-700">{organization.description}</p>

          {organization.statistics && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Impact & Statistics</h3>
              <p className="text-gray-700 text-sm">{organization.statistics}</p>
            </div>
          )}

          <div className="space-y-2 text-sm">
            {organization.website && (
              <div>
                <span className="font-medium text-gray-900">Website: </span>
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {organization.website}
                </a>
              </div>
            )}

            {organization.phone && (
              <div>
                <span className="font-medium text-gray-900">Phone: </span>
                <a href={`tel:${organization.phone}`} className="text-blue-600">
                  {organization.phone}
                </a>
              </div>
            )}

            {organization.email && (
              <div>
                <span className="font-medium text-gray-900">Email: </span>
                <a href={`mailto:${organization.email}`} className="text-blue-600">
                  {organization.email}
                </a>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Locations</h3>
            {organization.locations.map((location) => (
              <div key={location.id} className="text-sm text-gray-700 mb-1">
                <div className="flex items-start">
                  {location.isPrimary && <span className="text-blue-600 text-xs mr-1">●</span>}
                  {location.address}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
