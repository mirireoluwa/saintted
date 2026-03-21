# Data migration: populate track details from saintted.framer.website

from django.db import migrations


def populate(apps, schema_editor):
    Track = apps.get_model("api", "Track")
    details = {
        "one-chance": {
            "description": "the song talks about giving someone a chance to prove themselves after a mistake but realizing that sometimes apologies are not enough.\n\nthe lyrics express the struggle of holding onto special memories and feelings while trying to move on from a relationship that may not be working out, symbolized by the metaphor of giving one dance to prove wrong.",
            "year": 2025,
        },
        "shimmer": {
            "description": "i decided to do something really unconventional. This one has no vocals and I'm sure you all might be wondering, \"why?\". The truth is, it's the best way I could express how i was feeling at the time: \"i've got no words to say\".\n\n\"shimmer\" tells a story of solitude and how i've come to enjoy finding some quiet time alone to think and process life. This song is supposed to help with that. It is designed to help go through those moments of solitude.",
            "year": 2025,
        },
        "hyperphoria": {
            "description": "This song was actually written in the summer of 2023. I was at a point where I was just trying to figure out my life. It speaks about my aspirations to be a great person, the challenges I will face to get there, and leaving some pain from my past behind.",
            "year": 2024,
        },
        "runaway": {
            "description": "Runaway speaks about a transition period in my life. I wanted things to change so badly and I thought that the best way to express that was by essentially running away from the old to the new.",
            "year": 2022,
        },
        "home": {
            "description": "this song stems from two perspectives.\n\nthe first, from a quote that says, \"sometimes home is a person\". The idea for this song was developed from this quote.\n\nthe second, a vision for a better world where love is everything we express.",
            "year": 2022,
        },
    }
    for slug, data in details.items():
        Track.objects.filter(slug=slug).update(**data)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0003_track_description_year_urls"),
    ]

    operations = [
        migrations.RunPython(populate, noop),
    ]
